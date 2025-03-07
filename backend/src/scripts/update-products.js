import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.model.js';

dotenv.config();

const updateProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    // console.log('Connected to MongoDB');

    const result = await Product.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: null } }
    );

    // console.log(`Updated ${result.modifiedCount} products`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating products:', error);
    process.exit(1);
  }
};

updateProducts(); 