import express from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { authMiddleware } from '../middleware/auth.middleware.js';
import Product from '../models/Product.model.js';

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb('Error: Images only!');
    }
  }
});

// Validation middleware
const validateProduct = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('reorderPoint').isInt({ min: 0 }).withMessage('Reorder point must be a non-negative integer')
];

// Get all products
router.get('/', authMiddleware, async (req, res) => {
  try {
    // console.log('Products BE - req.userId:', req.userId);
    const products = await Product.find({ userId: req.userId });
    if (!products || products.length === 0) {
      return res.json({ 
        success: true, 
        products: [],
        message: 'No products found for this account'
      });
    }
    res.json({ 
      success: true, 
      products,
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get single product
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid product ID format' 
      });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }
    res.json({ 
      success: true, 
      product 
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create product
router.post('/',
  authMiddleware,
  upload.single('image'),
  validateProduct,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      // Ensure userId is set
      req.body.userId = req.userId;

      const productData = {
        ...req.body,
        ...(req.file && { image: `/uploads/${req.file.filename}` })
      };

      // console.log('BE - productData:', productData);

      const product = new Product(productData);
      await product.save();

      res.status(201).json({ 
        success: true,
        product,
        message: 'Product created successfully'
      });
    } catch (error) {
      console.error('Error creating product:', error);
      if (error.code === 11000) {
        return res.status(400).json({ 
          success: false,
          message: 'Product with this SKU already exists',
          field: 'sku'
        });
      }
      res.status(500).json({ 
        success: false,
        message: 'Failed to create product',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Update product
router.put('/:id',
  authMiddleware,
  upload.single('image'),
  validateProduct,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid product ID format' 
        });
      }

      const updateData = {
        ...req.body,
        ...(req.file && { image: `/uploads/${req.file.filename}` })
      };

      // Remove undefined or null values from updateData
      Object.keys(updateData).forEach(key => 
        (updateData[key] === undefined || updateData[key] === null) && delete updateData[key]
      );

      // Ensure userId is not modified
      delete updateData.userId;

      const product = await Product.findOneAndUpdate(
        { 
          _id: req.params.id, 
          userId: req.userId 
        },
        updateData,
        { 
          new: true,
          runValidators: true
        }
      );

      if (!product) {
        return res.status(404).json({ 
          success: false,
          message: 'Product not found' 
        });
      }

      res.json({ 
        success: true,
        product,
        message: 'Product updated successfully'
      });
    } catch (error) {
      console.error('Error updating product:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          success: false,
          message: 'Validation error',
          errors: Object.values(error.errors).map(err => err.message)
        });
      }
      res.status(500).json({ 
        success: false,
        message: 'Failed to update product',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Delete product
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid product ID format' 
      });
    }

    const product = await Product.findOneAndDelete({ 
      _id: req.params.id,
      userId: req.userId
    });

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }

    res.json({ 
      success: true,
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update stock levels
router.patch('/:id/stock',
  authMiddleware,
  body('quantity').isInt().withMessage('Quantity must be an integer'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { quantity } = req.body;
      const product = await Product.findOne({
        _id: req.params.id,
        userId: req.userId
      });

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      product.stock += parseInt(quantity);
      if (product.stock < 0) {
        return res.status(400).json({ message: 'Insufficient stock' });
      }

      await product.save();
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

export default router; 