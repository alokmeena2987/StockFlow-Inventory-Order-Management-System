import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const connectionString = process.env.MONGODB_URI;
    
    if (!connectionString) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(connectionString);
    
    // console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:');
    console.error(`Error name: ${error.name}`);
    console.error(`Error message: ${error.message}`);
    if (error.message.includes('IP')) {
      console.error('\nPossible solutions:');
      console.error('1. Add your current IP address to MongoDB Atlas whitelist');
      console.error('2. Check if your MongoDB Atlas cluster is active');
      console.error('3. Verify your connection string is correct');
    }
    process.exit(1);
  }
};

export default connectDB;