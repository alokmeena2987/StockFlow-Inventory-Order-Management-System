import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import axios from 'axios';
import toast from 'react-hot-toast';
import api from '../utils/api';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Register the font
Font.register({
  family: 'Helvetica'
});

// Helper functions for currency formatting
const formatCurrency = (amount, forPDF = false) => {
  const formattedAmount = (amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return `₹${formattedAmount}`;
};

const replaceDollarWithRupee = (text, forPDF = false) => {
  if (!text) return '';
  return text.replace(/\$[\d,\.]+/g, match => `₹${match.substring(1)}`);
};

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica'
  },
  header: {
    backgroundColor: '#1a365d',  // Dark blue header
    padding: 20,
    marginBottom: 20,
    borderRadius: 8,
    fontFamily: 'Helvetica'
  },
  headerTitle: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Helvetica'
  },
  headerDate: {
    fontSize: 12,
    color: '#E2E8F0',
    fontFamily: 'Helvetica'
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
    fontFamily: 'Helvetica'
  },
  sectionTitle: {
    fontSize: 20,
    color: '#2D3748',
    fontWeight: 'bold',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    fontFamily: 'Helvetica'
  },
  text: {
    fontSize: 12,
    marginBottom: 8,
    color: '#4b5563',
    fontFamily: 'Helvetica'
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 15,
    gap: 15
  },
  metricCard: {
    width: '31%',
    padding: 15,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  metricTitle: {
    fontSize: 12,
    color: '#4A5568',
    marginBottom: 6
  },
  metricValue: {
    fontSize: 18,
    color: '#2D3748',
    fontWeight: 'bold'
  },
  metricSubtitle: {
    fontSize: 10,
    color: '#718096',
    marginTop: 4
  },
  table: {
    display: 'table',
    width: 'auto',
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    minHeight: 35,
    alignItems: 'center'
  },
  tableHeader: {
    backgroundColor: '#F7FAFC'
  },
  tableCell: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    textAlign: 'left',
    wordWrap: 'break-word',
    fontFamily: 'Helvetica'
  },
  tableCellHeader: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4A5568',
    textAlign: 'left',
    wordWrap: 'break-word',
    fontFamily: 'Helvetica'
  },
  recommendationSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  recommendationTitle: {
    fontSize: 16,
    color: '#2D3748',
    fontWeight: 'bold',
    marginBottom: 10
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center'
  },
  bullet: {
    width: 15,
    fontSize: 12,
    color: '#4A5568'
  },
  recommendationText: {
    flex: 1,
    fontSize: 10,
    color: '#4A5568',
    fontFamily: 'Helvetica'
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    fontSize: 10
  }
});

// PDF Document Component
const ReportPDF = ({ report, reportType }) => {
  const analysis = report?.analysis || {};
  const data = report?.data || [];

  // Updated currency formatting for PDFs to use Rs. instead of ₹
  const formatCurrencyForPDF = (amount) => {
    if (amount === null || amount === undefined) return 'Rs. 0';
    const formattedAmount = amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    return `Rs. ${formattedAmount}`;
  };

  const replaceDollarWithRupeeForPDF = (text) => {
    if (!text) return '';
    return text.replace(/\$[\d,\.]+/g, match => `Rs. ${match.substring(1)}`);
  };

  const renderTableData = () => {
    if (!report) return null;

    switch (reportType) {
      case 'product-performance':
        const products = Array.isArray(report.data) ? report.data : (report.products || []);
        return (
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCellHeader}>Product</Text>
              <Text style={styles.tableCellHeader}>Revenue</Text>
              <Text style={styles.tableCellHeader}>Units Sold</Text>
              <Text style={styles.tableCellHeader}>Growth</Text>
              <Text style={styles.tableCellHeader}>Status</Text>
            </View>
            {products.map((product, index) => (
              <View style={styles.tableRow} key={index}>
                <Text style={styles.tableCell}>{product.name || 'N/A'}</Text>
                <Text style={styles.tableCell}>{formatCurrencyForPDF(product.revenue)}</Text>
                <Text style={styles.tableCell}>{product.unitsSold || 0}</Text>
                <Text style={styles.tableCell}>{(product.growth || 0)}%</Text>
                <Text style={styles.tableCell}>{product.status || 'N/A'}</Text>
              </View>
            ))}
          </View>
        );

      default:
        if (!Array.isArray(data)) return null;
        return (
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCellHeader}>Date</Text>
              <Text style={styles.tableCellHeader}>Sales</Text>
              <Text style={styles.tableCellHeader}>Orders</Text>
            </View>
            {data.map((item, index) => (
              <View style={styles.tableRow} key={index}>
                <Text style={styles.tableCell}>{item.date || 'N/A'}</Text>
                <Text style={styles.tableCell}>{formatCurrencyForPDF(item.totalSales)}</Text>
                <Text style={styles.tableCell}>{item.orderCount || 0}</Text>
              </View>
            ))}
          </View>
        );
    }
  };

  const renderMetrics = () => {
    if (!analysis) return null;

    switch (reportType) {
      case 'product-performance':
        return (
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>Top Performer</Text>
              <Text style={styles.metricValue}>{analysis.topPerformer?.name || 'N/A'}</Text>
              <Text style={styles.metricSubtitle}>
                Revenue: {formatCurrencyForPDF(analysis.topPerformer?.revenue || 0)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>Most Improved</Text>
              <Text style={styles.metricValue}>{analysis.mostImproved?.name || 'N/A'}</Text>
              <Text style={styles.metricSubtitle}>
                Growth: {analysis.mostImproved?.growth || 0}%
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>Needs Attention</Text>
              <Text style={styles.metricValue}>{analysis.needsAttention?.name || 'N/A'}</Text>
              <Text style={styles.metricSubtitle}>
                {analysis.needsAttention?.reason || 'No issues found'}
              </Text>
            </View>
          </View>
        );

      case 'weekly-sales':
      case 'monthly-sales':
        return (
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>Total Sales</Text>
              <Text style={styles.metricValue}>
                {formatCurrencyForPDF(analysis.totalSales)}
              </Text>
              <Text style={styles.metricSubtitle}>
                {reportType === 'weekly-sales' ? 'This Week' : 'This Month'}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>Average Daily Sales</Text>
              <Text style={styles.metricValue}>
                {formatCurrencyForPDF(analysis.averageDailySales)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>Growth Rate</Text>
              <Text style={styles.metricValue}>{analysis.growthRate || 0}%</Text>
              <Text style={styles.metricSubtitle}>vs Previous Period</Text>
            </View>
          </View>
        );

      case 'sales-trends':
        return (
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>Trend Direction</Text>
              <Text style={styles.metricValue}>{analysis.trend?.direction || 'N/A'}</Text>
              <Text style={styles.metricSubtitle}>
                {analysis.trend?.percentageChange ? `${analysis.trend.percentageChange}% change` : 'No change'}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>Confidence</Text>
              <Text style={styles.metricValue}>{analysis.trend?.confidence || 'N/A'}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>Status</Text>
              <Text style={styles.metricValue}>{analysis.trend?.status || 'N/A'}</Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {reportType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Report
          </Text>
          <Text style={styles.headerDate}>Generated on: {new Date().toLocaleDateString()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.text}>
            {(analysis?.summary || 'No summary available').replace(/₹/g, 'Rs. ')}
          </Text>

          {renderMetrics()}
          {renderTableData()}

          {analysis?.recommendations && (
            <View style={styles.recommendationSection}>
              <Text style={styles.recommendationTitle}>Recommendations</Text>
              {analysis.recommendations.map((rec, index) => (
                <View style={styles.recommendationItem} key={index}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.recommendationText}>
                    {rec.replace(/₹/g, 'Rs. ')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
};

export default function ReportDisplay({ reportType }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Add timeout handler
  const fetchWithTimeout = async (promise, timeoutMs = 10000) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Request timed out'));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  const fetchReport = async () => {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    const attemptFetch = async () => {
      try {
        setLoading(true);
        setError(null);

        // console.log('Fetching data for report type:', reportType);

        // First fetch the raw data based on report type with timeout
        let reportData;
        try {
          const response = await fetchWithTimeout(
            api.get(`/reports/${reportType}`, {
              params: {
                timestamp: new Date().getTime(),
                userId: user._id
              }
            })
          );

          if (!response.data) {
            throw new Error('No data received from server');
          }

          reportData = response.data;
          // console.log('Raw data fetched:', reportData);
        } catch (dataError) {
          console.error('Error fetching raw data:', dataError);
          throw new Error(
            dataError.response?.data?.message ||
            dataError.message ||
            'Failed to fetch report data'
          );
        }

        // Validate and transform data with timeout protection
        const transformPromise = async () => {
          if (!validateReportData(reportData, reportType)) {
            console.error('Invalid data structure:', reportData);
            throw new Error('Invalid data structure received from server');
          }

          // console.log('Transforming raw data...', reportData);
          const transformedData = await transformReportData(reportData, reportType);
          // console.log('Data transformed:', transformedData);

          if (!transformedData || !transformedData.data) {
            console.error('Invalid transformed data:', transformedData);
            throw new Error('Data transformation failed');
          }

          return transformedData;
        };

        const transformedData = await fetchWithTimeout(transformPromise());

        // console.log("TRANSFORMED DATA ~~~~~~~~~~~~~~~~~~", transformedData)
        // Handle AI analysis with timeout protection
        if (needsAIAnalysis(reportType)) {
          // console.log('Sending request to AI analyze endpoint...');
          try {
            const aiResponse = await fetchWithTimeout(
              api.post('/ai/analyze', {
                reportType,
                data: transformedData.data
              })
            );

            if (!aiResponse.data.success) {
              console.warn('AI analysis warning:', aiResponse.data);
              setReport(transformedData);
            } else {
              setReport({
                data: transformedData.data,
                analysis: {
                  ...transformedData.analysis,
                  aiAnalysis: aiResponse.data.analysis
                }
              });

              // console.log("REPORT ~~~~~~~~~~~~~~~~~~", report)
            }
          } catch (aiError) {
            console.warn('AI analysis failed:', aiError);
            setReport(transformedData);
          }
        } else {
          setReport(transformedData);
        }

        // console.log('Final report state:', transformedData);
        setLoading(false);
      } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error);

        if (retryCount < maxRetries) {
          retryCount++;
          // console.log(`Retrying in ${retryDelay}ms... (Attempt ${retryCount} of ${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attemptFetch();
        }

        setError(error.message || 'Failed to load report');
        setLoading(false);
        setReport(null);

        console.error('Final error details:', {
          reportType,
          error,
          attempts: retryCount,
          timestamp: new Date().toISOString()
        });
      }
    };

    // Ensure loading state is reset if component unmounts
    const cleanup = () => {
      setLoading(false);
      setError(null);
    };

    try {
      await attemptFetch();
    } catch (error) {
      cleanup();
    }
  };

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      setLoading(false);
      setError(null);
    };
  }, []);

  // Modify the useEffect for fetching to include proper cleanup
  useEffect(() => {
    const fetchData = async () => {
      await fetchReport();
    };

    fetchData();

    // Set up auto-refresh every 5 minutes
    const refreshInterval = setInterval(() => {
        setLastUpdate(new Date());
        fetchData();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [reportType, user._id]);

  // Helper function to validate report data structure
  const validateReportData = (data, type) => {
    if (!data) return false;

    switch (type) {
      case 'sales-trends':
      case 'weekly-sales':
      case 'monthly-sales':
        return Array.isArray(data) && data.every(item =>
          item &&
          typeof item === 'object' &&
          typeof item.date === 'string' &&
          (typeof item.totalSales === 'number' || typeof item.totalSales === 'string') &&
          (typeof item.orderCount === 'number' || typeof item.orderCount === 'string')
        );

      case 'reorder-suggestions':
        return (
          typeof data === 'object' &&
          Array.isArray(data.lowStock) &&
          typeof data.totalProducts === 'number'
        );

      case 'product-performance':
        // More lenient validation for product performance
        if (typeof data !== 'object') return false;

        // Handle both array and object response formats
        if (Array.isArray(data)) {
          return data.every(item => item && typeof item === 'object');
        }

        // Handle object format with products property
        if (data.products && Array.isArray(data.products)) {
          return true;
        }

        // Handle empty data case
        return true;

      default:
        return false;
    }
  };

  // Helper function to determine if AI analysis is needed
  const needsAIAnalysis = (type) => {
    return ['sales-trends', 'product-performance'].includes(type);
  };

  const transformReportData = async (data, type) => {
    // Initialize with empty data structure
    const defaultData = {
      data: type === 'reorder-suggestions' ? {
        lowStock: [],
        totalProducts: 0,
        criticalCount: 0,
        summary: {
          totalValue: 0,
          highPriority: 0,
          mediumPriority: 0,
          lowPriority: 0
        }
      } : [],
      analysis: {
        summary: 'No data available for analysis',
        trend: {
          direction: 'stable',
          percentageChange: 0,
          confidence: 'low',
          status: 'neutral'
        },
        patterns: [],
        recommendations: ['Start recording data to enable analysis']
      }
    };

    try {
      // If no data provided, return default structure
      if (!data) {
        // console.log(`No data available for ${type} transformation`);
        return defaultData;
      }

      // Transform data based on report type
      let transformedData;
      switch (type) {
        case 'sales-trends':
          if (!Array.isArray(data)) {
            console.warn('Invalid sales-trends data format:', data);
            return defaultData;
          }
          transformedData = {
            data: data.map(item => ({
              date: item.date || 'N/A',
              totalSales: parseFloat(item.totalSales) || 0,
              orderCount: parseInt(item.orderCount) || 0
            })).filter(item => item.date !== 'N/A'),
            analysis: {
              summary: data.length > 0 ? 'Sales trend analysis complete' : 'No sales data available',
              trend: {
                direction: calculateTrendDirection(data),
                percentageChange: calculatePercentageChange(data),
                confidence: calculateConfidence(data)
              },
              patterns: [],
              recommendations: generateRecommendations(data, 'sales-trends')
            }
          };
          break;

        case 'weekly-sales':
          if (!Array.isArray(data)) {
            console.warn('Invalid weekly-sales data format:', data);
            return defaultData;
          }
          
          const validWeeklyData = data.filter(item => 
            item && 
            typeof item.date === 'string' && 
            !isNaN(parseFloat(item.totalSales)) && 
            !isNaN(parseInt(item.orderCount))
          );

          transformedData = validWeeklyData.length === 0 ? {
            ...defaultData,
            analysis: {
              ...defaultData.analysis,
              summary: 'No valid weekly sales data available',
              recommendations: ['Ensure sales data is being properly recorded']
            }
          } : {
            data: validWeeklyData.map(item => ({
              date: item.date,
              totalSales: parseFloat(item.totalSales),
              orderCount: parseInt(item.orderCount)
            })),
            analysis: analyzeWeeklyData(validWeeklyData)
          };
          break;

        case 'monthly-sales':
          if (!Array.isArray(data)) {
            console.warn('Invalid monthly-sales data format:', data);
            return defaultData;
          }
          
          const validMonthlyData = data.filter(item => 
            item && 
            typeof item.date === 'string' && 
            !isNaN(parseFloat(item.totalSales)) && 
            !isNaN(parseInt(item.orderCount))
          );

          transformedData = validMonthlyData.length === 0 ? {
            ...defaultData,
            analysis: {
              ...defaultData.analysis,
              summary: 'No valid monthly sales data available',
              recommendations: ['Ensure monthly sales data is being properly recorded']
            }
          } : {
            data: validMonthlyData.map(item => ({
              date: item.date,
              totalSales: parseFloat(item.totalSales),
              orderCount: parseInt(item.orderCount),
              performance: calculateDailyPerformance(item, validMonthlyData.reduce((sum, day) => sum + parseFloat(day.totalSales), 0) / validMonthlyData.length)
            })),
            analysis: analyzeMonthlyData(validMonthlyData)
          };
          break;

        case 'product-performance':
          // Handle both array and object response formats
          let productsData = Array.isArray(data) ? data : (data.products || []);
          
          if (!Array.isArray(productsData)) {
            console.warn('Invalid product-performance data format:', data);
            return defaultData;
          }

          // Filter and validate product data
          const validProducts = productsData.filter(product => 
            product && 
            typeof product === 'object' &&
            product.name &&
            (!isNaN(parseFloat(product.revenue)) || !isNaN(parseFloat(product.unitsSold)))
          );

          transformedData = validProducts.length === 0 ? {
            ...defaultData,
            analysis: {
              ...defaultData.analysis,
              summary: 'No valid product performance data available',
              recommendations: ['Add products and record sales to begin tracking performance']
            }
          } : {
            data: validProducts.map(product => ({
              name: product.name,
              revenue: parseFloat(product.revenue) || 0,
              unitsSold: parseInt(product.unitsSold) || 0,
              growth: parseFloat(product.growth) || 0,
              status: calculateProductStatus(product),
              averageOrderValue: product.unitsSold > 0 ? (product.revenue / product.unitsSold) : 0
            })),
            analysis: analyzeProductPerformance(validProducts)
          };
          break;

        case 'reorder-suggestions':
          // Handle both array and object response formats
          const reorderData = typeof data === 'object' && !Array.isArray(data) ? data : { lowStock: [], totalProducts: 0 };
          
          if (!reorderData.lowStock || !Array.isArray(reorderData.lowStock)) {
            console.warn('Invalid reorder-suggestions data format:', data);
            return {
              ...defaultData,
              analysis: {
                ...defaultData.analysis,
                summary: 'No valid reorder suggestion data available',
                recommendations: ['Ensure inventory data is being properly tracked']
              }
            };
          }

          // Filter and validate reorder items
          const validReorderItems = reorderData.lowStock.filter(item =>
            item &&
            typeof item === 'object' &&
            item.productName &&
            (!isNaN(parseFloat(item.currentStock)) || !isNaN(parseFloat(item.recommendedOrder)))
          );

          // Calculate summary metrics
          const criticalCount = validReorderItems.filter(item => item.priority === 'high').length;
          const mediumCount = validReorderItems.filter(item => item.priority === 'medium').length;
          const lowCount = validReorderItems.filter(item => item.priority === 'low').length;
          const totalValue = validReorderItems.reduce((sum, item) => sum + (parseFloat(item.currentValue) || 0), 0);

          transformedData = validReorderItems.length === 0 ? {
            ...defaultData,
            analysis: {
              ...defaultData.analysis,
              summary: 'No items currently need reordering',
              recommendations: ['Monitor inventory levels regularly']
            }
          } : {
            data: {
              lowStock: validReorderItems.map(item => ({
                productName: item.productName,
                sku: item.sku || 'N/A',
                currentStock: parseInt(item.currentStock) || 0,
                recommendedOrder: parseInt(item.recommendedOrder) || 0,
                priority: item.priority || 'low',
                dailySales: parseFloat(item.dailySales) || 0,
                daysOfStock: parseInt(item.daysOfStock) || 0
              })),
              totalProducts: reorderData.totalProducts || validReorderItems.length,
              criticalCount,
              summary: {
                totalValue,
                highPriority: criticalCount,
                mediumPriority: mediumCount,
                lowPriority: lowCount
              }
            },
            analysis: {
              summary: `${validReorderItems.length} items need attention, with ${criticalCount} requiring immediate reorder`,
              recommendations: generateReorderRecommendations(validReorderItems)
            }
          };
          break;

        default:
          console.warn('Unknown report type:', type);
          return defaultData;
      }

      // Final validation of transformed data
      if (!transformedData || (!Array.isArray(transformedData.data) && typeof transformedData.data !== 'object')) {
        console.error('Invalid transformed data structure:', transformedData);
        return defaultData;
      }

      // console.log(`Transformed ${type} data:`, transformedData);
      return transformedData;
    } catch (error) {
      console.error(`Error transforming ${type} data:`, error);
      return defaultData;
    }
  };

  // Helper functions for data analysis
  const calculateTrendDirection = (data) => {
    if (!Array.isArray(data) || data.length < 2) return 'insufficient data';

    const sales = data.map(item => parseFloat(item.totalSales) || 0);
    const trend = sales[sales.length - 1] - sales[0];

    if (trend > 0) return 'upward';
    if (trend < 0) return 'downward';
    return 'stable';
  };

  const calculatePercentageChange = (data) => {
    if (!Array.isArray(data) || data.length < 2) return 0;

    const sales = data.map(item => parseFloat(item.totalSales) || 0);
    const firstValue = sales[0];
    const lastValue = sales[sales.length - 1];

    if (firstValue === 0) return 0;
    return Number(((lastValue - firstValue) / firstValue * 100).toFixed(2));
  };

  const calculateConfidence = (data) => {
    if (!Array.isArray(data)) return 'low';
    if (data.length < 3) return 'low';
    if (data.length < 7) return 'medium';
    return 'high';
  };

  const calculateDailyPerformance = (day, average) => {
    const sales = parseFloat(day.totalSales) || 0;
    const threshold = average * 0.1; // 10% threshold

    if (sales > average + threshold) return 'above';
    if (sales < average - threshold) return 'below';
    return 'average';
  };

  const analyzeWeeklyData = (data) => {
    const totalSales = data.reduce((sum, day) => sum + (parseFloat(day.totalSales) || 0), 0);
    const totalOrders = data.reduce((sum, day) => sum + (parseInt(day.orderCount) || 0), 0);
    const averageDailySales = totalSales / data.length;

    return {
      summary: `Weekly sales analysis for ${data.length} days`,
      totalSales,
      totalOrders,
      averageDailySales,
      recommendations: generateRecommendations(data, 'weekly-sales')
    };
  };

  const analyzeMonthlyData = (data) => {
    const totalSales = data.reduce((sum, day) => sum + (parseFloat(day.totalSales) || 0), 0);
    const totalOrders = data.reduce((sum, day) => sum + (parseInt(day.orderCount) || 0), 0);
    const averageDailySales = totalSales / data.length;

    return {
      summary: `Monthly sales analysis for ${data.length} days`,
      totalSales,
      totalOrders,
      averageDailySales,
      monthOverMonthGrowth: calculatePercentageChange(data),
      recommendations: generateRecommendations(data, 'monthly-sales')
    };
  };

  const analyzeProductPerformance = (products) => {
    if (!products || products.length === 0) {
      return {
        summary: 'No products available for analysis',
        topPerformer: null,
        mostImproved: null,
        needsAttention: null,
        recommendations: ['Add products to begin tracking performance']
      };
    }

    const sortedByRevenue = [...products].sort((a, b) =>
      (parseFloat(b.revenue) || 0) - (parseFloat(a.revenue) || 0)
    );

    const topPerformer = sortedByRevenue[0]?.revenue > 0 ? sortedByRevenue[0] : null;

    const sortedByGrowth = [...products].sort((a, b) =>
      (parseFloat(b.growth) || 0) - (parseFloat(a.growth) || 0)
    );

    const mostImproved = sortedByGrowth[0]?.growth > 0 ? sortedByGrowth[0] : null;

    const needsAttention = products.find(p =>
      (parseFloat(p.revenue) || 0) === 0 || (parseInt(p.unitsSold) || 0) === 0
    ) || null;

    const recommendations = generateProductRecommendations(products);

    return {
      summary: products.length > 0
        ? `Analysis of ${products.length} products${topPerformer ? ` with ${topPerformer.name} as top performer` : ''}`
        : 'No products available for analysis',
      topPerformer,
      mostImproved,
      needsAttention,
      recommendations
    };
  };

  const generateRecommendations = (data, type) => {
    const recommendations = [];

    if (!Array.isArray(data) || data.length === 0) {
      recommendations.push('Start recording sales data to enable analysis');
      return recommendations;
    }

    const totalSales = data.reduce((sum, item) => sum + (parseFloat(item.totalSales) || 0), 0);
    const averageSales = totalSales / data.length;
    const trend = calculateTrendDirection(data);

    if (trend === 'downward') {
      recommendations.push('Sales are trending downward. Review pricing and marketing strategies.');
    }

    const lowSalesDays = data.filter(day => (parseFloat(day.totalSales) || 0) < averageSales * 0.5).length;
    if (lowSalesDays > data.length * 0.3) {
      recommendations.push('Significant number of low-sales days detected. Consider promotional activities.');
    }

    return recommendations;
  };

  const generateReorderRecommendations = (products) => {
    const recommendations = [];

    const criticalStock = products.filter(p => p.priority === 'high');
    if (criticalStock.length > 0) {
      recommendations.push(`${criticalStock.length} products require immediate reordering`);
    }

    const lowStock = products.filter(p => p.priority === 'medium');
    if (lowStock.length > 0) {
      recommendations.push(`${lowStock.length} products are running low on stock`);
    }

    return recommendations;
  };

  const generateProductRecommendations = (products) => {
    const recommendations = [];

    if (!products || products.length === 0) {
      recommendations.push('Add products to begin tracking performance');
      return recommendations;
    }

    const lowPerformers = products.filter(p => (parseFloat(p.revenue) || 0) === 0);
    const highPerformers = products.filter(p => (parseFloat(p.growth) || 0) > 20);
    const mediumPerformers = products.filter(p =>
      (parseFloat(p.revenue) || 0) > 0 && (parseFloat(p.growth) || 0) <= 20
    );

    if (lowPerformers.length > 0) {
      recommendations.push(
        lowPerformers.length === products.length
          ? 'All products have no sales. Consider implementing marketing strategies and reviewing pricing.'
          : `${lowPerformers.length} products have no sales. Consider marketing or discontinuing these items.`
      );
    }

    if (highPerformers.length > 0) {
      recommendations.push(`${highPerformers.length} products show strong growth. Consider increasing inventory and marketing investment.`);
    }

    if (mediumPerformers.length > 0) {
      recommendations.push(`${mediumPerformers.length} products show moderate performance. Look for optimization opportunities.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Monitor product performance regularly and adjust strategies based on sales patterns.');
    }

    return recommendations;
  };

  // Helper function to format chart data
  const prepareChartData = (data, type) => {
    switch (type) {
      case 'sales-line':
        return {
          labels: data.map(item => item.date),
          datasets: [{
            label: 'Sales',
            data: data.map(item => item.totalSales),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        };
      case 'orders-bar':
        return {
          labels: data.map(item => item.date),
          datasets: [{
            label: 'Orders',
            data: data.map(item => item.orderCount),
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
          }]
        };
      default:
        return null;
    }
  };

  // Helper function to calculate product status based on performance metrics
  const calculateProductStatus = (product) => {
    const revenue = parseFloat(product.revenue) || 0;
    const growth = parseFloat(product.growth) || 0;
    const unitsSold = parseInt(product.unitsSold) || 0;

    if (revenue === 0 || unitsSold === 0) return 'poor';
    if (growth > 20 && revenue > 0) return 'excellent';
    if (growth > 10 && revenue > 0) return 'good';
    if (growth >= 0 && revenue > 0) return 'fair';
    return 'needs-attention';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="text-gray-600 text-sm">Loading {reportType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <svg className="h-6 w-6 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-red-800">Error Loading Report</h3>
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <div className="flex gap-4">
          <button
            onClick={fetchReport}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Retry
          </button>
          <button
            onClick={() => {
              setError(null);
              setReport(null);
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Clear Error
          </button>
        </div>
        <div className="mt-4 text-sm text-red-500">
          <p>If this error persists:</p>
          <ul className="list-disc list-inside mt-2">
            <li>Check your internet connection</li>
            <li>Verify that the data source is available</li>
            <li>Contact support if the problem continues</li>
          </ul>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <svg className="h-6 w-6 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-yellow-800">No Data Available</h3>
        </div>
        <p className="text-yellow-600 mb-4">No report data is currently available for {reportType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}.</p>
        <div className="flex gap-4">
          <button
            onClick={fetchReport}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh
          </button>
        </div>
        <div className="mt-4 text-sm text-yellow-600">
          <p>Possible reasons for no data:</p>
          <ul className="list-disc list-inside mt-2">
            <li>No transactions recorded for this period</li>
            <li>Data is still being processed</li>
            <li>Selected time period has no activity</li>
          </ul>
        </div>
      </div>
    );
  }

  const renderMetricCard = (title, value, subtitle) => (
    <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <h4 className="text-sm font-medium text-gray-500">{title}</h4>
      <p className="text-lg sm:text-xl font-semibold text-gray-900 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  const renderSalesTrends = () => {
    const analysis = report?.analysis || {};
    const trend = analysis?.trend || {};
    const patterns = analysis?.patterns || [];
    const recommendations = analysis?.recommendations || [];

    return (
      <div className="space-y-4 md:space-y-6">
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sales Trend Analysis</h3>
          <p className="text-gray-600 mb-4">{analysis.summary || 'No summary available'}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderMetricCard(
              "Trend Direction",
              trend.direction || 'N/A',
              trend.percentageChange ? `${trend.percentageChange}% change` : null
            )}
            {renderMetricCard(
              "Confidence",
              trend.confidence || 'N/A'
            )}
            {renderMetricCard(
              "Status",
              trend.status || 'N/A'
            )}
          </div>
        </div>

        {patterns.length > 0 && (
          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Observed Patterns</h3>
            <ul className="list-disc list-inside space-y-2">
              {patterns.map((pattern, index) => (
                <li key={index} className="text-gray-600">{pattern}</li>
              ))}
            </ul>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="bg-white p-4 md:p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
            <ul className="list-disc list-inside space-y-2">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="text-gray-600">{recommendation}</li>
              ))}
            </ul>
          </div>
        )}

        {Array.isArray(report.data) && report.data.length > 0 && (
          <>
            <div className="bg-white p-3 sm:p-6 rounded-lg shadow overflow-x-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sales Data</h3>
              <div className="min-w-full">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.data.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.date}</td>
                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900">₹{item.totalSales?.toLocaleString() || '0'}</td>
                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.orderCount || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sales Trend Visualization</h3>
              <div className="h-60 sm:h-80 w-full">
                <Line
                  data={prepareChartData(report.data, 'sales-line')}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' },
                      title: { display: true, text: 'Sales Trend Over Time' }
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { maxRotation: 45, minRotation: 45 }
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.1)' }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderWeeklySales = () => {
    // console.log('Weekly Sales Report Data:', report);

    if (!report || !report.data) {
      // console.log('No report data available');
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-medium">No Data Available</h3>
          <p className="text-yellow-600 mt-1">No sales data available for the selected period.</p>
        </div>
      );
    }

    // Calculate metrics from the data
    const totalSales = report.data.reduce((sum, day) => sum + (day.totalSales || 0), 0);
    const totalOrders = report.data.reduce((sum, day) => sum + (day.orderCount || 0), 0);
    const averageDailySales = totalSales / report.data.length;

    // Get previous week's data if available
    const previousWeekTotal = report.previousWeek?.totalSales || 0;
    const growthRate = previousWeekTotal ? ((totalSales - previousWeekTotal) / previousWeekTotal * 100) : 0;

    return (
      <div className="space-y-4 md:space-y-6">
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-4">Weekly Sales Overview</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">Sales performance for the past 7 days</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {renderMetricCard(
              "Total Sales",
              `₹${totalSales.toLocaleString()}`,
              "Past 7 Days"
            )}
            {renderMetricCard(
              "Average Daily Sales",
              `₹${averageDailySales.toLocaleString()}`,
              "Past 7 Days"
            )}
            {renderMetricCard(
              "Total Orders",
              totalOrders,
              "Past 7 Days"
            )}
          </div>
        </div>

        {Array.isArray(report.data) && report.data.length > 0 && (
          <>
            <div className="bg-white p-3 sm:p-6 rounded-lg shadow overflow-x-auto">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-4">Daily Breakdown</h3>
              <div className="min-w-full">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Average</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.data.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          ₹{(item.totalSales || 0).toLocaleString()}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {item.orderCount || 0}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          ₹{((item.totalSales || 0) / (item.orderCount || 1)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-4">Weekly Performance Visualization</h3>
              <div className="h-60 sm:h-80 w-full">
                <Line
                  data={{
                    labels: report.data.map(item => new Date(item.date).toLocaleDateString()),
                    datasets: [
                      {
                        label: 'Daily Sales',
                        data: report.data.map(item => item.totalSales || 0),
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        tension: 0.1
                      },
                      {
                        label: 'Orders',
                        data: report.data.map(item => item.orderCount || 0),
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.5)',
                        tension: 0.1,
                        yAxisID: 'orders'
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' },
                      title: { display: true, text: 'Weekly Sales & Orders Trend' }
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45,
                          font: { size: window.innerWidth < 640 ? 8 : 12 }
                        }
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.1)' },
                        ticks: {
                          font: { size: window.innerWidth < 640 ? 8 : 12 },
                          callback: value => `₹${value.toLocaleString()}`
                        }
                      },
                      orders: {
                        position: 'right',
                        beginAtZero: true,
                        grid: { display: false },
                        ticks: {
                          font: { size: window.innerWidth < 640 ? 8 : 12 }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderMonthlySales = () => {
    const analysis = report.analysis.aiSummary || report.analysis;

    // Ensure required properties exist with default values
    const safeAnalysis = {
      summary: analysis.summary || 'No summary available',
      totalSales: analysis.totalSales || 0,
      averageDailySales: analysis.averageDailySales || 0,
      totalOrders: analysis.totalOrders || 0,
      monthOverMonthGrowth: analysis.monthOverMonthGrowth || 0,
      topProducts: analysis.topProducts || [],
      recommendations: analysis.recommendations || []
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Performance Summary</h3>
          <p className="text-gray-600 mb-4">{safeAnalysis.summary}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {renderMetricCard("Total Sales", `₹${safeAnalysis.totalSales.toLocaleString()}`, "This Month")}
            {renderMetricCard("Average Daily Sales", `₹${safeAnalysis.averageDailySales.toLocaleString()}`, "This Month")}
            {renderMetricCard("Growth", `${safeAnalysis.monthOverMonthGrowth}%`, "vs Last Month")}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report.data.map((day, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{day.totalSales.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.orderCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${day.performance === 'above' ? 'bg-green-100 text-green-800' :
                          day.performance === 'below' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                        {day.performance === 'above' ? '↑ Above Average' :
                          day.performance === 'below' ? '↓ Below Average' :
                            '→ Average'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Performance Visualization</h3>
          <div className="h-80">
            <Line
              data={prepareChartData(report.data, 'sales-line')}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: true, text: 'Daily Sales This Month' }
                }
              }}
            />
          </div>
        </div>

        {safeAnalysis.recommendations.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
            <ul className="list-disc list-inside space-y-2">
              {safeAnalysis.recommendations.map((recommendation, index) => (
                <li key={index} className="text-gray-600">{recommendation}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderReorderSuggestions = () => {
    // console.log('Reorder Suggestions Data:', report);

    if (!report || !report.data || !report.data.lowStock) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-medium">No Data Available</h3>
          <p className="text-yellow-600 mt-1">No reorder suggestions available at this time.</p>
        </div>
      );
    }

    const { lowStock, totalProducts, criticalCount, summary } = report.data;

    // Prepare data for priority chart
    const priorityData = {
      labels: ['High', 'Medium', 'Low'],
      datasets: [{
        data: [
          summary.highPriority || 0,
          summary.mediumPriority || 0,
          summary.lowPriority || 0
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.5)',  // red for high
          'rgba(234, 179, 8, 0.5)',  // yellow for medium
          'rgba(34, 197, 94, 0.5)'   // green for low
        ],
        borderColor: [
          'rgb(239, 68, 68)',  // red border
          'rgb(234, 179, 8)',  // yellow border
          'rgb(34, 197, 94)'   // green border
        ],
        borderWidth: 1
      }]
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Reorder Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderMetricCard(
              "Total Products",
              totalProducts,
              "In inventory"
            )}
            {renderMetricCard(
              "Critical Items",
              criticalCount,
              "Need immediate attention"
            )}
            {renderMetricCard(
              "Total Low Stock Value",
              `₹${summary.totalValue?.toLocaleString() || '0'}`,
              "Current inventory value"
            )}
            {renderMetricCard(
              "Items to Reorder",
              lowStock.length,
              "Below reorder point"
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Products to Reorder</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Sales</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days of Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lowStock.map((item, index) => (
                      <tr key={index} className={`hover:bg-gray-50 ${
                        item.priority === 'high' ? 'bg-red-50' :
                        item.priority === 'medium' ? 'bg-yellow-50' :
                        'bg-green-50'
                      }`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                          <div className="text-sm text-gray-500">{item.sku}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.currentStock}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.dailySales.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.daysOfStock}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.recommendedOrder}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            item.priority === 'high' ? 'bg-red-100 text-red-800' :
                            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Priority Distribution</h3>
            <div className="h-64">
              <Pie
                data={priorityData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        padding: 20,
                        generateLabels: (chart) => {
                          const data = chart.data;
                          if (data.labels.length && data.datasets.length) {
                            return data.labels.map((label, i) => ({
                              text: `${label} (${data.datasets[0].data[i]})`,
                              fillStyle: data.datasets[0].backgroundColor[i],
                              strokeStyle: data.datasets[0].borderColor[i],
                              lineWidth: 1,
                              hidden: isNaN(data.datasets[0].data[i]) || data.datasets[0].data[i] === 0,
                              index: i
                            }));
                          }
                          return [];
                        }
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const label = context.label || '';
                          const value = context.raw || 0;
                          return `${label}: ${value} items`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {report.analysis?.recommendations && report.analysis.recommendations.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
            <ul className="list-disc list-inside space-y-2">
              {report.analysis.recommendations.map((rec, index) => (
                <li key={index} className="text-gray-600">{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderProductPerformance = () => {
    // console.log('Product Performance Data:', report);

    if (!report || !report.data || report.data.length === 0) {
      return (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-yellow-800 font-medium">No Products Available</h3>
            <p className="text-yellow-600 mt-1">
              No products have been added or no sales data is available yet.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Getting Started</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Add products to your inventory</li>
              <li>Record sales transactions</li>
              <li>Monitor performance metrics</li>
              <li>Review recommendations regularly</li>
            </ul>
          </div>
        </div>
      );
    }

    const { analysis } = report;
    const { topPerformer, mostImproved, needsAttention, recommendations } = analysis || {};

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderMetricCard(
              "Top Performer",
              topPerformer?.name || 'N/A',
              topPerformer ? `Revenue: ₹${(topPerformer.revenue || 0).toLocaleString()}` : 'No top performer yet'
            )}
            {renderMetricCard(
              "Most Improved",
              mostImproved?.name || 'N/A',
              mostImproved ? `Growth: ${mostImproved.growth || 0}%` : 'No growth data yet'
            )}
            {renderMetricCard(
              "Needs Attention",
              needsAttention?.name || 'N/A',
              needsAttention?.reason || 'No immediate concerns'
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top 5 Products by Revenue</h3>
            <div className="h-80">
              <Bar
                data={{
                  labels: report.data.slice(0, 5).map(p => p.name || 'N/A'),
                  datasets: [{
                    label: 'Revenue',
                    data: report.data.slice(0, 5).map(p => p.revenue || 0),
                    backgroundColor: [
                      'rgba(59, 130, 246, 0.5)',
                      'rgba(16, 185, 129, 0.5)',
                      'rgba(245, 158, 11, 0.5)',
                      'rgba(99, 102, 241, 0.5)',
                      'rgba(236, 72, 153, 0.5)'
                    ]
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Revenue Distribution' }
                  },
                  scales: {
                    x: {
                      grid: { display: false }
                    },
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0, 0, 0, 0.1)' },
                      ticks: {
                        callback: value => `₹${value.toLocaleString()}`
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units Sold</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.data.map((product, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{(product.revenue || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.unitsSold || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.growth || 0}%</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${(product.status || '').toLowerCase() === 'excellent' ? 'bg-green-100 text-green-800' :
                            (product.status || '').toLowerCase() === 'good' ? 'bg-blue-100 text-blue-800' :
                              (product.status || '').toLowerCase() === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                          }`}>
                          {product.status ? (product.status.charAt(0).toUpperCase() + product.status.slice(1).toLowerCase()) : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {recommendations && recommendations.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
            <ul className="list-disc list-inside space-y-2">
              {recommendations.map((rec, index) => (
                <li key={index} className="text-gray-600">{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    try {
      switch (reportType) {
        case 'sales-trends':
          return renderSalesTrends();
        case 'weekly-sales':
          return renderWeeklySales();
        case 'monthly-sales':
          return renderMonthlySales();
        case 'reorder-suggestions':
          return renderReorderSuggestions();
        case 'product-performance':
          return renderProductPerformance();
        default:
          return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-yellow-800 font-medium">Unsupported Report Type</h3>
              <p className="text-yellow-600 mt-1">The selected report type is not supported.</p>
            </div>
          );
      }
    } catch (error) {
      console.error('Error rendering report content:', error);
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Displaying Report</h3>
          <p className="text-red-600 mt-1">There was an error displaying the report content.</p>
          <button
            onClick={fetchReport}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pt-8 pb-6 border-b border-gray-200 mb-8">
        <div>
          <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            {reportType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Report
          </h2>
        </div>
        <div className="flex gap-4">
          <button
            onClick={fetchReport}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh Report
          </button>
          {report && (
            <PDFDownloadLink
              document={<ReportPDF report={report} reportType={reportType} />}
              fileName={`${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              {({ blob, url, loading, error }) =>
                loading ? 'Preparing PDF...' : 'Download PDF'
              }
            </PDFDownloadLink>
          )}
        </div>
      </div>
      {renderContent()}
    </div>
  );
}