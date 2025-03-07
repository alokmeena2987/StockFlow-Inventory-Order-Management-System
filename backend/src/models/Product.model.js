import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reorderPoint: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  unit: {
    type: String,
    required: true,
    default: 'piece'
  },
  images: [{
    type: String
  }],
  supplier: {
    name: String,
    contact: String,
    email: String
  },
  status: {
    type: String,
    enum: ['active', 'discontinued', 'out-of-stock'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Index for faster searches
productSchema.index({ name: 'text', sku: 'text', category: 'text' });

const Product = mongoose.model('Product', productSchema);
export default Product; 