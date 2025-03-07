import express from 'express';
import { body, validationResult } from 'express-validator';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import mongoose from 'mongoose';

const router = express.Router();

// Validation middleware
const validateOrder = [
  body('customer.name').trim().notEmpty().withMessage('Customer name is required'),
  body('customer.email').isEmail().withMessage('Valid customer email is required'),
  body('items').isArray().notEmpty().withMessage('Order must contain items'),
  body('items.*.product').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('payment.method').isIn(['cash', 'card', 'bank-transfer']).withMessage('Invalid payment method'),
  body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be a positive number')
];

// Get all orders
router.get('/', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId })
      .populate('items.product')
      .populate('processedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true,
      orders: orders || [],
      count: orders ? orders.length : 0
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get single order
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.userId
    }).populate('items.product').populate('processedBy', 'name email');

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }
    
    res.json({ 
      success: true,
      order 
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create order
router.post('/', authMiddleware, validateOrder, async (req, res) => {
  try {
    // console.log('BE - req.body:', req.body);
    const errors = validationResult(req);
    // console.log(errors);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    // Ensure userId is set
    req.body.userId = req.userId;

    // Calculate total amount from items
    let calculatedTotal = 0;
    const productUpdates = [];

    // Verify and validate all products first
    for (const item of req.body.items) {
      if (!item.product || !mongoose.Types.ObjectId.isValid(item.product)) {
        return res.status(400).json({
          success: false,
          message: `Invalid product ID: ${item.product || 'undefined'}`
        });
      }

      // console.log('BE - item.product:', item.product);

      const product = await Product.findOne({
        _id: item.product,
        userId: req.userId
      });
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${product.name}`,
          product: product.name,
          available: product.stock,
          requested: item.quantity
        });
      }

      calculatedTotal += product.price * item.quantity;
      productUpdates.push({
        product,
        quantity: item.quantity,
        price: product.price
      });
    }

    // Create order with calculated values
    const orderData = {
      userId: req.userId,
      customer: req.body.customer,
      payment: req.body.payment,
      notes: req.body.notes,
      status: 'pending',
      processedBy: req.user._id,
      totalAmount: calculatedTotal,
      items: productUpdates.map(update => ({
        product: update.product._id,
        quantity: update.quantity,
        price: update.price
      }))
    };

    const order = new Order(orderData);
    await order.save();

    // Update product stock levels
    for (const update of productUpdates) {
      update.product.stock -= update.quantity;
      await update.product.save();
    }
    
    // Return populated order
    const populatedOrder = await Order.findById(order._id)
      .populate('items.product')
      .populate('processedBy', 'name email');
    
    res.status(201).json({
      success: true,
      order: populatedOrder,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Order creation  (be):', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update order status
router.patch('/:id/status',
  authMiddleware,
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid order ID format'
        });
      }

      const { status } = req.body;
      const order = await Order.findOne({
        _id: req.params.id,
        userId: req.userId
      }).populate('items.product');

      if (!order) {
        return res.status(404).json({ 
          success: false,
          message: 'Order not found' 
        });
      }

      const oldStatus = order.status;
      order.status = status;

      // Handle stock updates based on status changes
      if (status === 'cancelled' && oldStatus !== 'cancelled') {
        // Restore stock when order is cancelled
        for (const item of order.items) {
          const product = await Product.findOne({
            _id: item.product._id,
            userId: req.userId
          });
          if (product) {
            product.stock += item.quantity;
            await product.save();
          }
        }
      } else if (oldStatus === 'cancelled' && status !== 'cancelled') {
        // Deduct stock when order is un-cancelled
        for (const item of order.items) {
          const product = await Product.findOne({
            _id: item.product._id,
            userId: req.userId
          });
          if (product) {
            if (product.stock < item.quantity) {
              return res.status(400).json({
                success: false,
                message: `Insufficient stock for product: ${product.name}`
              });
            }
            product.stock -= item.quantity;
            await product.save();
          }
        }
      }

      await order.save();
      res.json({
        success: true,
        order,
        message: 'Order status updated successfully'
      });
    } catch (error) {
      console.error('Status update error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to update order status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Generate order invoice
router.get('/:id/invoice', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.userId
    }).populate('items.product');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const doc = new PDFDocument();
    const filename = `invoice-${order._id}.pdf`;
    const filepath = path.join('uploads', filename);

    doc.pipe(fs.createWriteStream(filepath));

    // Add invoice content
    doc.fontSize(25).text('Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${order._id}`);
    doc.text(`Date: ${order.createdAt.toLocaleDateString()}`);
    doc.moveDown();
    doc.text('Customer Details:');
    doc.text(`Name: ${order.customer.name}`);
    doc.text(`Email: ${order.customer.email}`);
    doc.moveDown();
    doc.text('Items:');
    
    let total = 0;
    order.items.forEach(item => {
      const amount = item.quantity * item.product.price;
      total += amount;
      doc.text(`${item.product.name} - ${item.quantity} x $${item.product.price} = $${amount}`);
    });
    
    doc.moveDown();
    doc.text(`Total Amount: $${total}`);
    doc.end();

    res.download(filepath, filename, (err) => {
      if (err) {
        res.status(500).json({ message: 'Error downloading invoice' });
      }
      // Clean up file after download
      fs.unlink(filepath, () => {});
    });
  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({ message: 'Failed to generate invoice' });
  }
});

export default router; 