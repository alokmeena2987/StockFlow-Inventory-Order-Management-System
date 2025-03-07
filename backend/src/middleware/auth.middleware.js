import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

export const authMiddleware = async (req, res, next) => {
  try {
    // console.log(req.headers);
    const token = req.headers.authorization?.split(' ')[1];
    // console.log('Product BE - token:', token);
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log(decoded);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.active) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found or inactive' 
      });
    }

    // Set user and userId on request object
    req.user = user;
    req.userId = user._id;
    req.username = user.name;
    
    // console.log(`User ${user.email} (${user._id}) authenticated`);
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      success: false,
      message: 'Invalid token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 