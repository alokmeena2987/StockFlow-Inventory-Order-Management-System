import express from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { authMiddleware} from '../middleware/auth.middleware.js';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';

const router = express.Router();

// Helper function to format currency with proper rupee symbol
const formatCurrency = (amount) => {
  const formattedAmount = amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return `\u20B9${formattedAmount}`;
};

// Generate sales report
router.get('/sales', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { status: { $in: ['delivered', 'shipped'] } };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .populate('items.product')
      .populate('processedBy', 'name');

    // Calculate metrics
    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalSales / totalOrders || 0;

    // Product-wise sales
    const productSales = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const productId = item.product._id.toString();
        if (!productSales[productId]) {
          productSales[productId] = {
            name: item.product.name,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[productId].quantity += item.quantity;
        productSales[productId].revenue += item.quantity * item.price;
      });
    });

    // Generate PDF report
    const doc = new PDFDocument();
    const reportPath = path.join('uploads', 'reports', `sales-report-${Date.now()}.pdf`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    doc.pipe(fs.createWriteStream(reportPath));

    // Add content to PDF
    doc.fontSize(24).text('Sales Report', { align: 'center' })
      .moveDown(2);

    doc.fontSize(12)
      .text(`Period: ${startDate || 'All time'} to ${endDate || 'Present'}`)
      .moveDown()
      .text(`Total Sales: ${formatCurrency(totalSales)}`)
      .text(`Total Orders: ${totalOrders}`)
      .text(`Average Order Value: ${formatCurrency(averageOrderValue)}`)
      .moveDown();

    // Add product-wise sales
    doc.text('Product-wise Sales:', { underline: true }).moveDown();
    Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .forEach(product => {
        doc.text(`${product.name}`)
          .text(`Quantity Sold: ${product.quantity}`)
          .text(`Revenue: ${formatCurrency(product.revenue)}`)
          .moveDown();
      });

    // Add summary section if available
    if (analysis && analysis.summary) {
      doc.moveDown()
        .fontSize(14)
        .text('Analysis Summary', { underline: true })
        .moveDown()
        .fontSize(12)
        .text(analysis.summary.replace(/\$[\d,\.]+/g, match => `\u20B9${match.substring(1)}`));
    }

    // Add recommendations if available
    if (analysis && analysis.recommendations) {
      doc.moveDown()
        .fontSize(14)
        .text('Recommendations', { underline: true })
        .moveDown()
        .fontSize(12);
      
      analysis.recommendations.forEach(rec => {
        doc.text(`• ${rec.replace(/\$[\d,\.]+/g, match => `\u20B9${match.substring(1)}`)}`).moveDown(0.5);
      });
    }

    doc.end();
    res.download(reportPath);
  } catch (error) {
    res.status(500).json({ message: 'Error generating sales report' });
  }
});

// Generate inventory report
router.get('/inventory', authMiddleware, async (req, res) => {
  try {
    const products = await Product.find({}).sort({ category: 1, name: 1 });
    const doc = new PDFDocument();
    const reportPath = path.join('uploads', 'reports', `inventory-report-${Date.now()}.pdf`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    doc.pipe(fs.createWriteStream(reportPath));

    doc.fontSize(20).text('Inventory Report', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`).moveDown();

    // Group products by category
    const categorizedProducts = products.reduce((acc, product) => {
      if (!acc[product.category]) acc[product.category] = [];
      acc[product.category].push(product);
      return acc;
    }, {});

    // Add inventory details by category
    Object.entries(categorizedProducts).forEach(([category, products]) => {
      doc.fontSize(14).text(category, { underline: true }).moveDown().fontSize(12);
      products.forEach(product => {
        doc.text(`${product.name} (SKU: ${product.sku})`)
          .text(`Current Stock: ${product.stock} ${product.unit}`)
          .text(`Reorder Point: ${product.reorderPoint} ${product.unit}`)
          .text(`Status: ${product.status}`)
          .moveDown();
      });
    });

    // Add summary
    const totalProducts = products.length;
    const lowStock = products.filter(p => p.stock <= p.reorderPoint).length;
    const outOfStock = products.filter(p => p.stock === 0).length;

    doc.moveDown()
      .fontSize(14)
      .text('Summary', { underline: true })
      .moveDown()
      .fontSize(12)
      .text(`Total Products: ${totalProducts}`)
      .text(`Low Stock Items: ${lowStock}`)
      .text(`Out of Stock Items: ${outOfStock}`);

    doc.end();
    res.download(reportPath);
  } catch (error) {
    res.status(500).json({ message: 'Error generating inventory report' });
  }
});

// Get dashboard statistics
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Sales statistics
    const monthlyOrders = await Order.find({
      createdAt: { $gte: startOfMonth },
      status: { $in: ['delivered', 'shipped'] }
    });

    const monthlySales = monthlyOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const orderCount = monthlyOrders.length;

    // Inventory statistics
    const products = await Product.find({});
    const lowStock = products.filter(p => p.stock <= p.reorderPoint).length;
    const outOfStock = products.filter(p => p.stock === 0).length;

    // Top selling products
    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          status: { $in: ['delivered', 'shipped'] }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    res.json({
      sales: {
        monthly: monthlySales,
        orderCount,
        averageOrderValue: monthlySales / orderCount || 0
      },
      inventory: {
        total: products.length,
        lowStock,
        outOfStock
      },
      topProducts: topProducts.map(p => ({
        name: p.product.name,
        quantity: p.totalQuantity,
        revenue: p.totalRevenue
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
});

// Get sales trends data
router.get('/sales-trends', authMiddleware, async (req, res) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);
    
    const data = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['delivered', 'shipped', 'processing'] },
          userId: req.userId.toString()
        }
      },
      {
        $group: {
          _id: { 
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: "$createdAt",
              timezone: "UTC"
            } 
          },
          totalSales: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // console.log("DATA ~~~~~~~~~~~~~~~~~~", data)
    // Transform data
    const transformedData = data.map(d => ({
      date: d._id,
      totalSales: d.totalSales,
      orderCount: d.orderCount
    }));

    res.json(transformedData);
  } catch (error) {
    console.error('Error fetching sales trends:', error);
    res.status(500).json({ message: 'Failed to fetch sales trends' });
  }
});

// Get weekly sales data
router.get('/weekly-sales', authMiddleware, async (req, res) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    // startDate.setHours(0, 0, 0, 0);
    const data = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['delivered', 'shipped', 'processing'] },
          userId: req.userId.toString()
        }
      },
      {
        $group: {
          _id: { 
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: "$createdAt",
              timezone: "UTC"
            } 
          },
          totalSales: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Fill in missing dates with zero values
    const allDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      allDates.push(date.toISOString().split('T')[0]);
    }

    // Debug logging
    // console.log('Weekly Sales - Raw Data:', data);
    // console.log('Weekly Sales - All Dates:', allDates);

    const transformedData = allDates.map(date => {
      const found = data.find(d => d._id === date);
      // console.log(`Processing date ${date}:`, found || 'No data');
      return {
        date,
        totalSales: found ? found.totalSales : 0,
        orderCount: found ? found.orderCount : 0
      };
    });

    // console.log('Weekly Sales - Transformed Data:', transformedData);

    res.json(transformedData);
  } catch (error) {
    console.error('Error fetching weekly sales:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch weekly sales',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get monthly sales data
router.get('/monthly-sales', authMiddleware, async (req, res) => {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    
    // console.log("START DATE ~~~~~~~~~~~~~~~~~~", startDate)

    const data = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['delivered', 'shipped', 'processing'] },
          userId: req.userId.toString()
        }
      },
      {
        $group: {
          _id: { 
            $dateToString: { 
              format: "%Y-%m-%d", 
              date: "$createdAt",
              timezone: "UTC"
            } 
          },
          totalSales: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Fill in missing dates
    const allDates = [];
    const endDate = new Date();
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      allDates.push(d.toISOString().split('T')[0]);
    }

    const transformedData = allDates.map(date => {
      const found = data.find(d => d._id === date);
      return {
        date,
        totalSales: found ? found.totalSales : 0,
        orderCount: found ? found.orderCount : 0
      };
    });

    res.json(transformedData);
  } catch (error) {
    console.error('Error fetching monthly sales:', error);
    res.status(500).json({ message: 'Failed to fetch monthly sales' });
  }
});

// Get reorder suggestions data
router.get('/reorder-suggestions', authMiddleware, async (req, res) => {
  try {
    const products = await Product.find({ userId: req.userId.toString() })
      .select('name sku stock reorderPoint price category supplier')
      .populate('supplier', 'name leadTime reliability')
      .lean();

    if (!products || products.length === 0) {
      return res.json({
        lowStock: [],
        totalProducts: 0,
        criticalCount: 0
      });
    }

    // Get sales data for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: { $in: ['delivered', 'shipped', 'processing'] },
          userId: req.userId.toString()
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    // Create a map of product sales data for quick lookup
    const productSalesMap = new Map(
      salesData.map(item => [item._id.toString(), item])
    );

    // Process each product
    const reorderItems = products.map(product => {
      const sales = productSalesMap.get(product._id.toString()) || { totalQuantity: 0, totalOrders: 0 };
      const dailySales = sales.totalQuantity / 30;
      const daysOfStock = dailySales > 0 ? product.stock / dailySales : (product.stock > 0 ? 999 : 0);
      
      // Calculate safety stock based on lead time and sales variability
      const leadTime = product.supplier?.leadTime || 7; // default 7 days if not specified
      const safetyStock = Math.ceil(dailySales * leadTime * 1.5); // 1.5 safety factor
      
      // Calculate recommended order quantity
      const recommendedOrder = Math.max(
        0,
        Math.ceil((dailySales * (leadTime + 14)) - product.stock + safetyStock)
      );

      // Determine priority based on multiple factors
      let priority = 'low';
      if (product.stock <= product.reorderPoint || daysOfStock < 7) {
        priority = 'high';
      } else if (product.stock <= product.reorderPoint * 1.5 || daysOfStock < 14) {
        priority = 'medium';
      }

      return {
        productName: product.name,
        sku: product.sku,
        currentStock: product.stock,
        reorderPoint: product.reorderPoint,
        dailySales: parseFloat(dailySales.toFixed(2)),
        daysOfStock: Math.round(daysOfStock),
        recommendedOrder,
        priority,
        supplier: product.supplier?.name || 'No supplier assigned',
        category: product.category
      };
    });

    // Filter and sort items that need attention
    const filteredItems = reorderItems.filter(item => 
      item.currentStock <= item.reorderPoint || 
      item.daysOfStock < 14 ||
      item.recommendedOrder > 0
    );

    // Sort by priority (high -> medium -> low) and then by days of stock (ascending)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sortedItems = filteredItems.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.daysOfStock - b.daysOfStock;
    });

    res.json({
      lowStock: sortedItems,
      totalProducts: products.length,
      criticalCount: sortedItems.filter(item => item.priority === 'high').length,
      summary: {
        highPriority: sortedItems.filter(item => item.priority === 'high').length,
        mediumPriority: sortedItems.filter(item => item.priority === 'medium').length,
        lowPriority: sortedItems.filter(item => item.priority === 'low').length,
        totalValue: sortedItems.reduce((sum, item) => sum + (item.currentStock * (item.price || 0)), 0)
      }
    });
  } catch (error) {
    console.error('Error fetching reorder suggestions:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch reorder suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get product performance data
router.get('/product-performance', authMiddleware, async (req, res) => {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    const products = await Product.find({ userId: req.userId })
      .select('name sku stock price category');
    
    if (!products || products.length === 0) {
      return res.json({
        products: [],
        topPerformer: null,
        mostImproved: null,
        needsAttention: null
      });
    }

    const productsWithPerformance = await Promise.all(products.map(async (product) => {
      const salesData = await Order.aggregate([
        {
          $match: {
            'items.product': product._id,
            status: { $in: ['delivered', 'shipped'] },
            createdAt: { $gte: startDate },
            userId: req.userId.toString()
          }
        },
        {
          $unwind: '$items'
        },
        {
          $match: {
            'items.product': product._id
          }
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
            unitsSold: { $sum: '$items.quantity' }
          }
        }
      ]);

      // console.log("SALES DATA ~~~~~~~~~~~~~~~~~~", salesData)

      const performance = salesData[0] || { revenue: 0, unitsSold: 0 };
      
      const previousMonthStart = new Date(startDate);
      // console.log("PREVIOUS MONTH START ~~~~~~~~~~~~~~~~~~", previousMonthStart)
      // previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
      // console.log("PREVIOUS MONTH START ~~~~~~~~~~~~~~~~~~", previousMonthStart)
      const previousSales = await Order.aggregate([
        {
          $match: {
            'items.product': product._id,
            status: { $in: ['delivered', 'shipped'] },
            createdAt: {
              $gte: previousMonthStart,
              $lt: startDate
            },
            userId: req.userId
          }
        },
        {
          $unwind: '$items'
        },
        {
          $match: {
            'items.product': product._id
          }
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
          }
        }
      ]);

      const previousRevenue = previousSales[0]?.revenue || 0;
      const growth = previousRevenue > 0 
        ? ((performance.revenue - previousRevenue) / previousRevenue) * 100 
        : 0;

      return {
        name: product.name,
        revenue: performance.revenue,
        unitsSold: performance.unitsSold,
        growth: Math.round(growth * 100) / 100,
        status: getProductStatus(growth, performance.unitsSold, product.stock)
      };
    }));

    productsWithPerformance.sort((a, b) => b.revenue - a.revenue);

    const topPerformer = productsWithPerformance[0] || null;
    const mostImproved = [...productsWithPerformance].sort((a, b) => b.growth - a.growth)[0] || null;
    const needsAttention = productsWithPerformance.find(p => p.status === 'poor') || null;

    res.json({
      products: productsWithPerformance,
      topPerformer,
      mostImproved,
      needsAttention: needsAttention ? {
        ...needsAttention,
        reason: 'Declining sales and low stock'
      } : null
    });
  } catch (error) {
    console.error('Error fetching product performance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch product performance',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

function getProductStatus(growth, unitsSold, stock) {
  if (growth > 20 && unitsSold > 0) return 'excellent';
  if (growth > 0 && unitsSold > 0) return 'good';
  if (growth === 0 || unitsSold === 0) return 'fair';
  return 'poor';
}

export default router; 