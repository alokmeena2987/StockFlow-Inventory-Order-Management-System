import express from 'express';
import axios from 'axios';
import { authMiddleware } from '../middleware/auth.middleware.js';
import Order from '../models/Order.model.js';
import Product from '../models/Product.model.js';

const router = express.Router();

// Health check endpoint
router.get('/health', authMiddleware, async (req, res) => {
  try {
    const hasApiKey = !!process.env.TOGETHER_API_KEY;
    res.json({ 
      available: hasApiKey,
      message: hasApiKey ? 'AI service is available' : 'AI service is not configured'
    });
  } catch (error) {
    res.status(500).json({ available: false, message: 'AI service is not available' });
  }
});

// Helper function to check if AI service is available
function checkAIService() {
  if (!process.env.TOGETHER_API_KEY) {
    throw new Error('AI service is not configured. Please contact your administrator.');
  }
}

// Helper function to call Together.ai API
async function predictWithTogetherAI(prompt) {
  try {
    // console.log('Checking AI service configuration...');
    checkAIService();
    
    // console.log('Sending request to Together.ai API...');
    const response = await axios.post('https://api.together.xyz/inference',
      {
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        prompt: prompt,
        max_tokens: 1024,
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50,
        repetition_penalty: 1,
        stop: ['</s>', 'Human:', 'Assistant:']
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // console.log('Received response from Together.ai API');
    return response.data.output.choices[0].text.trim();
  } catch (error) {
    console.error('Together.ai API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    if (!process.env.TOGETHER_API_KEY) {
      throw new Error('AI service is not configured');
    }
    throw new Error(`Failed to get AI prediction: ${error.message}`);
  }
}

function generatePromptForReportType(reportType, data) {
  const basePrompt = `You are a business analytics AI. Analyze the following data and provide insights in JSON format. Keep the response focused and professional.`;
  
  const prompts = {
    'weekly-sales': `${basePrompt}
Weekly Sales Data:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "summary": "Brief summary of sales performance",
  "totalSales": number,
  "averageDailySales": number,
  "trend": "upward/downward/stable",
  "prediction": {
    "nextWeek": number,
    "confidence": "high/medium/low"
  },
  "recommendations": [
    "actionable recommendation 1",
    "actionable recommendation 2"
  ]
}`,

    'monthly-sales': `${basePrompt}
Monthly Sales Data:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "summary": "Brief summary of monthly performance",
  "totalSales": number,
  "averageDailySales": number,
  "trend": "upward/downward/stable",
  "prediction": {
    "nextMonth": number,
    "confidence": "high/medium/low"
  },
  "recommendations": [
    "actionable recommendation 1",
    "actionable recommendation 2"
  ]
}`,

    'sales-trends': `${basePrompt}
Sales Trend Data:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "summary": "Brief summary of sales trends",
  "trend": {
    "direction": "upward/downward/stable",
    "percentageChange": number,
    "confidence": "high/medium/low"
  },
  "patterns": [
    "observed pattern 1",
    "observed pattern 2"
  ],
  "recommendations": [
    "actionable recommendation 1",
    "actionable recommendation 2"
  ]
}`,

    'reorder-suggestions': `${basePrompt}
Inventory Data:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "summary": "Brief summary of inventory status",
  "criticalItems": [
    {
      "product": "product name",
      "currentStock": number,
      "reorderAmount": number,
      "priority": "high/medium/low"
    }
  ],
  "recommendations": [
    "actionable recommendation 1",
    "actionable recommendation 2"
  ]
}`,

    'product-performance': `${basePrompt}
Product Performance Data:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "summary": "Brief summary of product performance",
  "topPerformers": [
    {
      "product": "product name",
      "performance": "description",
      "recommendation": "specific action"
    }
  ],
  "recommendations": [
    "actionable recommendation 1",
    "actionable recommendation 2"
  ]
}`,

    'supplier-recommendations': `${basePrompt}
Product and Supplier Data:
${JSON.stringify(data, null, 2)}

Provide a JSON response with:
{
  "summary": "Brief analysis of supplier options",
  "recommendedSuppliers": [
    {
      "supplier": "supplier name",
      "score": number,
      "reasoning": "Why this supplier is recommended",
      "priceAnalysis": "Price trend analysis",
      "reliabilityScore": number
    }
  ],
  "orderRecommendations": {
    "optimalQuantity": number,
    "timing": "When to place the order",
    "estimatedCost": number,
    "potentialSavings": number
  },
  "actionableInsights": [
    "specific action item 1",
    "specific action item 2"
  ]
}`
  };
  
  return prompts[reportType] || basePrompt;
}

// Helper function to validate AI response
function validateAIResponse(response, reportType) {
  // console.log('Validating AI response for report type:', reportType);
  try {
    const parsed = JSON.parse(response);
    // console.log('Successfully parsed AI response');
    
    // Check for required fields based on report type
    const requiredFields = {
      'weekly-sales': ['summary', 'totalSales', 'prediction'],
      'monthly-sales': ['summary', 'totalSales', 'prediction'],
      'sales-trends': ['summary', 'trend', 'recommendations'],
      'reorder-suggestions': ['summary', 'criticalItems'],
      'product-performance': ['summary', 'topPerformers']
    };
    
    const fields = requiredFields[reportType] || ['summary'];
    const isValid = fields.every(field => parsed.hasOwnProperty(field));
    
    if (!isValid) {
      // console.warn('Missing required fields in AI response:', {
      //   reportType,
      //   required: fields,
      //   received: Object.keys(parsed)
      // });
      return null;
    }
    
    // console.log('AI response validation successful');
    return parsed;
  } catch (error) {
    console.error('AI response validation error:', {
      error: error.message,
      response: response
    });
    return null;
  }
}

const generateReport = async (reportType, userId) => {
  try {
    let data;
    const currentDate = new Date();
    
    switch (reportType) {
      case 'weekly-sales':
      case 'monthly-sales': {
        const days = reportType === 'weekly-sales' ? 7 : 30;
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0); // Start of the day
        
        data = await Order.aggregate([
          {
            $match: {
              createdAt: { 
                $gte: startDate,
                $lte: currentDate
              },
              status: { $in: ['delivered', 'shipped', 'processing'] },
              userId: userId
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
          { 
            $sort: { "_id": 1 } 
          }
        ]).allowDiskUse(true);
        
        // Fill in missing dates with zero values
        const allDates = [];
        for (let i = 0; i < days; i++) {
          const date = new Date(currentDate);
          date.setDate(date.getDate() - i);
          allDates.unshift(date.toISOString().split('T')[0]);
        }

        data = allDates.map(date => {
          const found = data.find(d => d._id === date);
          return {
            date,
            totalSales: found ? found.totalSales : 0,
            orderCount: found ? found.orderCount : 0
          };
        });
        break;
      }
      
      case 'sales-trends': {
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        
        data = await Order.aggregate([
          {
            $match: {
              createdAt: { 
                $gte: startDate,
                $lte: currentDate
              },
              status: { $in: ['delivered', 'shipped', 'processing'] },
              userId: userId
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
          { 
            $sort: { "_id": -1 } 
          }
        ]).allowDiskUse(true);

        data = data.map(d => ({ 
          date: d._id, 
          totalSales: d.totalSales,
          orderCount: d.orderCount 
        }));
        break;
      }

      case 'reorder-suggestions':
        data = await getReorderSuggestionsData(userId);
        break;

      case 'product-performance':
        data = await getProductPerformanceData(userId);
        break;

      default:
        throw new Error('Invalid report type');
    }
    
    // If no data, return appropriate message
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return {
        data: [],
        analysis: {
          summary: 'No data available for analysis',
          recommendations: ['Start recording sales/inventory data to enable analysis']
        },
        source: 'empty'
      };
    }
    
    // If AI service is not available, return fallback report
    if (!process.env.TOGETHER_API_KEY) {
      // console.log('AI service not configured, using fallback analysis');
      return generateFallbackReport(reportType, data);
    }

    try {
      const prompt = generatePromptForReportType(reportType, data);
      const aiResponse = await predictWithTogetherAI(prompt);
      
      // Validate AI response
      const validatedResponse = validateAIResponse(aiResponse, reportType);
      if (validatedResponse) {
        return { 
          data, 
          analysis: validatedResponse,
          source: 'ai'
        };
      }
      
      // If validation fails, use fallback with AI summary
      // console.log('Invalid AI response format, using fallback with AI summary');
      const fallbackReport = generateFallbackReport(reportType, data);
      return {
        ...fallbackReport,
        analysis: {
          ...fallbackReport.analysis,
          aiSummary: aiResponse
        },
        source: 'hybrid'
      };
    } catch (aiError) {
      // console.log('AI service error, using fallback analysis:', aiError);
      return generateFallbackReport(reportType, data);
    }
  } catch (error) {
    console.error('Report generation error:', error);
    return {
      data: [],
      analysis: {
        error: error.message,
        summary: 'Failed to generate report',
        recommendations: ['Check system logs for error details']
      },
      source: 'error'
    };
  }
};

// Helper function to analyze sales trend
function analyzeSalesTrend(data) {
  // Handle empty or invalid data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      direction: 'insufficient data',
      percentageChange: 0,
      confidence: 'low',
      action: 'Start recording sales data',
      details: 'No sales data available for analysis'
    };
  }

  if (data.length < 2) {
    return {
      direction: 'insufficient data',
      percentageChange: 0,
      confidence: 'low',
      action: 'Collect more data',
      details: 'Not enough data for trend analysis'
    };
  }

  // Sort data by date to ensure chronological order
  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Calculate metrics for both halves
  const firstHalf = sortedData.slice(0, Math.floor(sortedData.length / 2));
  const secondHalf = sortedData.slice(Math.floor(sortedData.length / 2));
  
  // Calculate average order value for both periods
  const firstHalfAvgOrderValue = firstHalf.reduce((sum, day) => sum + (day.totalSales / (day.orderCount || 1)), 0) / firstHalf.length;
  const secondHalfAvgOrderValue = secondHalf.reduce((sum, day) => sum + (day.totalSales / (day.orderCount || 1)), 0) / secondHalf.length;
  
  // Calculate total sales for both periods
  const firstHalfTotalSales = firstHalf.reduce((sum, day) => sum + day.totalSales, 0);
  const secondHalfTotalSales = secondHalf.reduce((sum, day) => sum + day.totalSales, 0);
  
  // Calculate percentage changes
  const avgOrderValueChange = ((secondHalfAvgOrderValue - firstHalfAvgOrderValue) / firstHalfAvgOrderValue) * 100;
  const totalSalesChange = ((secondHalfTotalSales - firstHalfTotalSales) / firstHalfTotalSales) * 100;
  
  // Determine overall trend considering both metrics
  const overallChange = (avgOrderValueChange + totalSalesChange) / 2;
  
  // Calculate confidence based on data consistency
  const getConfidence = () => {
    const salesVariation = Math.abs(avgOrderValueChange - totalSalesChange);
    if (salesVariation > 50) return 'low';
    if (salesVariation > 25) return 'medium';
    return 'high';
  };

  // Determine trend status
  const getTrendStatus = (change) => {
    if (Math.abs(change) < 5) return 'stable';
    if (change > 20) return 'strong growth';
    if (change > 0) return 'moderate growth';
    if (change > -20) return 'moderate decline';
    return 'significant decline';
  };

  // Generate action recommendations based on trend
  const getAction = (change, confidence) => {
    if (confidence === 'low') return 'Gather more consistent sales data';
    if (change < -10) return 'Investigate sales decline and implement recovery strategies';
    if (change < 0) return 'Monitor market conditions and optimize pricing';
    if (change > 20) return 'Scale operations to maintain growth momentum';
    if (change > 0) return 'Continue current successful strategies';
    return 'Maintain current operations while monitoring trends';
  };

  const confidence = getConfidence();
  const status = getTrendStatus(overallChange);
  const action = getAction(overallChange, confidence);

  return {
    direction: overallChange > 0 ? 'upward' : overallChange < 0 ? 'downward' : 'stable',
    percentageChange: Math.round(Math.abs(overallChange) * 100) / 100,
    confidence,
    status,
    action,
    details: `Overall sales trend shows ${Math.abs(overallChange).toFixed(2)}% ${overallChange > 0 ? 'growth' : 'decline'} with ${confidence} confidence. Average order value ${avgOrderValueChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(avgOrderValueChange).toFixed(2)}% while total sales volume ${totalSalesChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(totalSalesChange).toFixed(2)}%.`
  };
}

// Helper function to analyze product performance
function analyzeProductPerformance(products) {
  const sortedByStock = [...products].sort((a, b) => a.stock - b.stock);
  const sortedByPrice = [...products].sort((a, b) => b.price - a.price);
  
  return {
    topProducts: sortedByPrice.slice(0, 5).map(p => ({
      name: p.name,
      price: p.price,
      category: p.category
    })),
    recommendations: sortedByStock.slice(0, 5).map(p => ({
      product: p.name,
      currentStock: p.stock,
      action: p.stock < 10 ? 'Reorder immediately' : 'Monitor stock levels',
      priority: p.stock < 10 ? 'High' : 'Medium'
    }))
  };
}

// AI analysis endpoint
router.post('/analyze', authMiddleware, async (req, res) => {
  // console.log('Received analyze request');
  try {
    const { reportType, data } = req.body;
    
    // console.log('Request parameters:', {
    //   reportType,
    //   dataReceived: !!data,
    //   userId: req.userId
    // });
    
    if (!reportType || !data) {
      // console.warn('Missing required parameters');
      return res.status(400).json({ 
        success: false,
        message: 'Report type and data are required' 
      });
    }

    // Generate fallback report first
    // console.log('Generating fallback report...');
    const fallbackReport = generateFallbackReport(reportType, data);
    
    // Only try AI analysis if Together API key is configured
    if (process.env.TOGETHER_API_KEY) {
      try {
        // console.log('Attempting AI analysis...');
        const prompt = generatePromptForReportType(reportType, data);
        const aiResponse = await predictWithTogetherAI(prompt);
        const analysis = validateAIResponse(aiResponse, reportType);
        
        if (analysis) {
          // console.log('AI analysis successful');
          return res.json({
            success: true,
            data: data,
            analysis: analysis,
            source: 'ai'
          });
        }
      } catch (aiError) {
        // console.log('AI analysis failed, using fallback:', aiError.message);
        // Continue with fallback if AI fails
      }
    }

    // Return fallback report if AI analysis fails or is not available
    // console.log('Using fallback report');
    res.json({
      success: true,
      data: fallbackReport.data,
      analysis: fallbackReport.analysis,
      source: 'fallback'
    });
  } catch (error) {
    console.error('AI analysis endpoint error:', {
      error: error.message,
      stack: error.stack
    });
    
    // Return a safe fallback even in case of errors
    const safeResponse = {
      success: true,
      data: [],
      analysis: {
        summary: 'Unable to generate report at this time',
        trend: {
          direction: 'stable',
          percentageChange: 0,
          confidence: 'low'
        },
        recommendations: ['Try again later']
      },
      source: 'error'
    };
    
    res.json(safeResponse);
  }
});

// Helper functions for data gathering
async function getWeeklySalesData(userId) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  return await getSalesData(startDate, userId);
}

async function getMonthlySalesData(userId) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  return await getSalesData(startDate, userId);
}

async function getSalesTrendsData(userId) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);
  return await getSalesData(startDate, userId);
}

async function getReorderSuggestionsData(userId) {
  try {
    // Get all products with their details and populate supplier information
    const products = await Product.find({ userId: userId })
      .select('name sku stock reorderPoint price category supplier')
      .populate('supplier', 'name leadTime reliability')
      .lean();

    if (!products || products.length === 0) {
      return {
        lowStock: [],
        totalProducts: 0,
        criticalCount: 0
      };
    }

    // Get sales data for the last 30 days for all products
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Aggregate sales data for all products at once
    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: { $in: ['delivered', 'shipped', 'processing'] },
          userId: userId
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

    return {
      lowStock: sortedItems,
      totalProducts: products.length,
      criticalCount: sortedItems.filter(item => item.priority === 'high').length,
      summary: {
        highPriority: sortedItems.filter(item => item.priority === 'high').length,
        mediumPriority: sortedItems.filter(item => item.priority === 'medium').length,
        lowPriority: sortedItems.filter(item => item.priority === 'low').length,
        totalValue: sortedItems.reduce((sum, item) => sum + (item.currentStock * (item.price || 0)), 0)
      }
    };
  } catch (error) {
    console.error('Error in getReorderSuggestionsData:', error);
    throw error;
  }
}

async function getProductPerformanceData(userId) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);

  const products = await Product.find({ userId: userId }).select('name sku stock price category');
  
  // Get sales data for each product
  const productsWithPerformance = await Promise.all(products.map(async (product) => {
    const salesData = await Order.aggregate([
      {
        $match: {
          'items.product': product._id,
          status: { $in: ['delivered', 'shipped'] },
          createdAt: { $gte: startDate },
          userId: userId
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

    const performance = salesData[0] || { revenue: 0, unitsSold: 0 };
    
    // Calculate growth by comparing with previous month
    const previousMonthStart = new Date(startDate);
    previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
    
    const previousSales = await Order.aggregate([
      {
        $match: {
          'items.product': product._id,
          status: { $in: ['delivered', 'shipped'] },
          createdAt: {
            $gte: previousMonthStart,
            $lt: startDate
          },
          userId: userId
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

  // Sort products by revenue
  productsWithPerformance.sort((a, b) => b.revenue - a.revenue);

  const topPerformer = productsWithPerformance[0] || null;
  const mostImproved = [...productsWithPerformance].sort((a, b) => b.growth - a.growth)[0] || null;
  const needsAttention = productsWithPerformance.find(p => p.status === 'poor') || null;

  return {
    products: productsWithPerformance,
    topPerformer,
    mostImproved,
    needsAttention: needsAttention ? {
      ...needsAttention,
      reason: 'Declining sales and low stock'
    } : null
  };
}

function getProductStatus(growth, unitsSold, stock) {
  if (growth > 20 && unitsSold > 0) return 'excellent';
  if (growth > 0 && unitsSold > 0) return 'good';
  if (growth === 0 || unitsSold === 0) return 'fair';
  return 'poor';
}

async function getSalesData(startDate, userId) {
  return await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: { $in: ['delivered', 'shipped'] },
        userId: userId
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        totalSales: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);
}

// Get sales prediction for a product
router.get('/predict/sales/:productId', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.productId,
      userId: req.userId
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get historical sales data
    const salesHistory = await Order.aggregate([
      {
        $match: {
          'items.product': product._id,
          userId: req.userId,
          status: { $in: ['delivered', 'shipped'] },
          createdAt: {
            $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
          }
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
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          totalQuantity: { $sum: '$items.quantity' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Prepare data for AI analysis
    const salesData = salesHistory.map(day => ({
      date: day._id,
      quantity: day.totalQuantity
    }));

    // Create prompt for Together.ai
    const prompt = `As an AI sales analyst, analyze this 90-day sales data for product "${product.name}" (SKU: ${product.sku}):

Sales History:
${JSON.stringify(salesData, null, 2)}

Current Stock: ${product.stock}
Reorder Point: ${product.reorderPoint}

Please provide:
1. Weekly sales prediction
2. Monthly sales prediction
3. Sales trend analysis
4. Reorder recommendations
5. Key insights

Format the response as JSON.`;

    // Get AI prediction
    const aiAnalysis = await predictWithTogetherAI(prompt);
    res.json(aiAnalysis);
  } catch (error) {
    console.error('Sales prediction error:', error);
    res.status(500).json({ message: 'Failed to generate sales prediction' });
  }
});

// Get inventory optimization recommendations
router.get('/recommendations/inventory', authMiddleware, async (req, res) => {
  try {
    const products = await Product.find({ userId: req.userId });
    const recommendations = [];

    for (const product of products) {
      // Get sales velocity (average daily sales)
      const salesData = await Order.aggregate([
        {
          $match: {
            'items.product': product._id,
            userId: req.userId,
            status: { $in: ['delivered', 'shipped'] },
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
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
            totalQuantity: { $sum: '$items.quantity' }
          }
        }
      ]);

      const dailySales = salesData.length > 0 ? salesData[0].totalQuantity / 30 : 0;
      const daysOfStock = dailySales > 0 ? product.stock / dailySales : null;

      let recommendation = {
        product: {
          id: product._id,
          name: product.name,
          sku: product.sku
        },
        currentStock: product.stock,
        dailySales: Math.round(dailySales * 100) / 100,
        daysOfStock: daysOfStock ? Math.round(daysOfStock) : null,
        status: 'optimal',
        action: 'none',
        priority: 'low'
      };

      // Add recommendation logic
      if (daysOfStock !== null) {
        if (daysOfStock < 7) {
          recommendation.status = 'critical';
          recommendation.action = 'reorder_urgent';
          recommendation.priority = 'high';
        } else if (daysOfStock < 14) {
          recommendation.status = 'warning';
          recommendation.action = 'reorder_soon';
          recommendation.priority = 'medium';
        } else if (daysOfStock > 60) {
          recommendation.status = 'overstocked';
          recommendation.action = 'reduce_inventory';
          recommendation.priority = 'medium';
        }
      }

      recommendations.push(recommendation);
    }

    res.json(recommendations);
  } catch (error) {
    console.error('Inventory recommendations error:', error);
    res.status(500).json({ message: 'Failed to generate inventory recommendations' });
  }
});

// Helper function to generate fallback reports without AI
function generateFallbackReport(reportType, data) {
  // Handle empty or invalid data
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return {
      data: [],
      analysis: {
        summary: 'No data available for analysis',
        trend: {
          direction: 'insufficient data',
          percentageChange: 0,
          confidence: 'low'
        },
        patterns: ['No patterns detected - insufficient data'],
        recommendations: ['Start recording data to enable analysis']
      }
    };
  }

  switch (reportType) {
    case 'weekly-sales':
    case 'monthly-sales': {
      const totalSales = data.reduce((sum, day) => sum + day.totalSales, 0);
      const avgSales = totalSales / data.length || 0;
      const prediction = Math.round(avgSales * (reportType === 'weekly-sales' ? 7 : 30));
      
      // Calculate growth rate
      const growthRate = data.length > 1 
        ? ((data[data.length - 1].totalSales - data[0].totalSales) / data[0].totalSales * 100).toFixed(2)
        : 0;

      // Calculate total orders
      const totalOrders = data.reduce((sum, day) => sum + day.orderCount, 0);

      // Process daily data with performance indicators
      const processedData = data.map(day => ({
        ...day,
        performance: day.totalSales > avgSales ? 'above' : day.totalSales < avgSales ? 'below' : 'average'
      }));

      // Generate recommendations based on performance
      const recommendations = [
        avgSales > 0 ? `Average daily sales: $${Math.round(avgSales).toLocaleString()}` : 'No sales recorded',
        growthRate > 0 ? 'Maintain positive sales momentum' : 'Investigate ways to improve sales',
        totalOrders > 0 ? `Process ${totalOrders} orders efficiently` : 'Focus on generating orders'
      ].filter(Boolean);

      return {
        data: processedData,
        analysis: {
          summary: `Total sales for the ${reportType === 'weekly-sales' ? 'week' : 'month'}: $${totalSales.toLocaleString()}`,
          totalSales: totalSales,
          averageDailySales: Math.round(avgSales),
          totalOrders: totalOrders,
          monthOverMonthGrowth: parseFloat(growthRate),
          prediction: {
            nextPeriod: prediction,
            confidence: 'medium'
          },
          recommendations: recommendations
        }
      };
    }
    
    case 'sales-trends': {
      const trend = analyzeSalesTrend(data);
      return {
        data,
        analysis: {
          summary: `Sales trend analysis shows ${trend.details}`,
          trend: {
            direction: trend.direction,
            percentageChange: trend.percentageChange,
            confidence: trend.confidence
          },
          patterns: [
            trend.details,
            data.length > 0 ? `Average daily sales: $${Math.round(data.reduce((sum, day) => sum + (day.totalSales || 0), 0) / data.length)}` : 'No sales data available'
          ],
          recommendations: [
            trend.action,
            'Monitor customer feedback and market trends',
            'Review pricing strategy regularly'
          ]
        }
      };
    }
    
    case 'reorder-suggestions': {
      const reorderItems = data.lowStock || [];
      return {
        data,
        analysis: {
          summary: `${reorderItems.length} products need attention`,
          reorderItems: reorderItems.map(item => ({
            productName: item.productName,
            currentStock: item.currentStock,
            recommendedOrder: item.recommendedOrder,
            priority: item.priority
          })),
          recommendations: [
            'Review stock levels regularly',
            'Consider increasing reorder points for high-priority items',
            'Monitor supplier lead times'
          ]
        }
      };
    }
    
    case 'product-performance': {
      const products = data.products || [];
      const topPerformer = data.topPerformer || null;
      const mostImproved = data.mostImproved || null;
      const needsAttention = data.needsAttention || null;
      
      return {
        data,
        analysis: {
          summary: 'Product performance analysis based on revenue and growth',
          topPerformer: topPerformer || { name: 'N/A', revenue: 0, growth: 0 },
          mostImproved: mostImproved || { name: 'N/A', growth: 0 },
          needsAttention: needsAttention || { name: 'N/A', reason: 'No issues found' },
          products: products.map(p => ({
            name: p.name,
            revenue: p.revenue,
            unitsSold: p.unitsSold,
            growth: p.growth,
            status: p.status
          }))
        }
      };
    }
    
    default:
      return {
        data,
        analysis: {
          summary: 'Basic statistical analysis (AI service unavailable)',
          recommendations: ['Enable AI service for detailed insights']
        }
      };
  }
}

export default router; 