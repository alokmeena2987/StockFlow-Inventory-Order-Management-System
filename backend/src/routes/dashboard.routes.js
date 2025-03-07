import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId; // Get userId from authenticated user

    // Get total products and low stock count - filter by userId
    const products = await Product.find({ userId });
    const totalProducts = products.length;
    const lowStock = products.filter(product => product.stock <= product.reorderPoint).length;
    const outOfStock = products.filter(product => product.stock === 0).length;

    // Get order statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - today.getDay());

    // Get orders with status, date filters and userId
    const [
      totalOrders,
      pendingOrders,
      dailyOrders,
      weeklyOrders,
      monthlyOrders
    ] = await Promise.all([
      Order.countDocuments({ userId }),
      Order.countDocuments({ userId, status: 'pending' }),
      Order.find({ 
        userId,
        createdAt: { $gte: today },
        status: { $ne: 'cancelled' }
      }),
      Order.find({ 
        userId,
        createdAt: { $gte: thisWeek },
        status: { $ne: 'cancelled' }
      }),
      Order.find({ 
        userId,
        createdAt: { $gte: thisMonth },
        status: { $ne: 'cancelled' }
      })
    ]);

    // Calculate revenue
    const dailyRevenue = dailyOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const weeklyRevenue = weeklyOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    res.json({
      username: req.username,
      totalProducts,
      lowStock,
      outOfStock,
      totalOrders,
      pendingOrders,
      revenue: {
        daily: dailyRevenue,
        weekly: weeklyRevenue,
        monthly: monthlyRevenue
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
});

export default router; 