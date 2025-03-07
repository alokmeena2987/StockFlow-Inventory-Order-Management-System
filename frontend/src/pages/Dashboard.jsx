import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    username: "",
    totalProducts: 0,
    lowStock: 0,
    totalOrders: 0,
    pendingOrders: 0,
    revenue: {
      daily: 0,
      weekly: 0,
      monthly: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardStats = useCallback(async (showError = true) => {
    try {
      if (!user?.token) {
        throw new Error('No authentication token found');
      }

      setLoading(true);
      setError(null);
      
      const response = await axios.get('http://localhost:5000/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError(error.message);
      if (showError) {
        const message = error.response?.data?.message || 'Failed to fetch dashboard statistics';
        toast.error(message, { id: 'dashboard-error' });
      }
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    fetchDashboardStats();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      // Don't show error toast for auto-refresh
      fetchDashboardStats(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboardStats]);

  const handleQuickAction = (action) => {
    switch (action) {
      case 'addProduct':
        navigate('/products', { state: { openCreateModal: true } });
        break;
      case 'createOrder':
        navigate('/orders', { state: { openCreateModal: true } });
        break;
      case 'generateReport':
        navigate('/reports', { state: { selectedReport: 'sales-trends' } });
        break;
      case 'viewLowStock':
        navigate('/products', { state: { filterLowStock: true } });
        break;
      case 'viewPendingOrders':
        navigate('/orders', { state: { filterStatus: 'pending' } });
        break;
      default:
        break;
    }
  };

  if (loading && !stats.totalProducts) {
    return (
      <div className="flex justify-center items-center h-full p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="pt-8 pb-6 border-b border-gray-200">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Dashboard
        </h1>
        <p className="mt-2 text-gray-600">Welcome back, {stats.username}!</p>
      </div>

      <div className="flex justify-end my-8">
        <button
          onClick={() => fetchDashboardStats(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          Refresh Data
        </button>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
          <p className="text-red-700 font-medium">Error: {error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div 
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer transform hover:-translate-y-1"
          onClick={() => handleQuickAction('viewLowStock')}
        >
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Total Products</h3>
          <p className="text-3xl font-bold text-blue-700">{stats.totalProducts}</p>
          <p className="mt-2 text-sm text-blue-600">{stats.lowStock} items low in stock</p>
        </div>

        <div 
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer transform hover:-translate-y-1"
          onClick={() => handleQuickAction('viewPendingOrders')}
        >
          <h3 className="text-lg font-semibold text-green-900 mb-2">Total Orders</h3>
          <p className="text-3xl font-bold text-green-700">{stats.totalOrders}</p>
          <p className="mt-2 text-sm text-green-600">{stats.pendingOrders} orders pending</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">Daily Revenue</h3>
          <p className="text-3xl font-bold text-purple-700">₹{stats.revenue.daily.toLocaleString()}</p>
          <p className="mt-2 text-sm text-purple-600">Today's earnings</p>
        </div>

        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-lg font-semibold text-pink-900 mb-2">Monthly Revenue</h3>
          <p className="text-3xl font-bold text-pink-700">₹{stats.revenue.monthly.toLocaleString()}</p>
          <p className="mt-2 text-sm text-pink-600">This month's earnings</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button 
            onClick={() => handleQuickAction('addProduct')}
            className="p-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 transform hover:-translate-y-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Product
          </button>
          <button 
            onClick={() => handleQuickAction('createOrder')}
            className="p-4 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 transform hover:-translate-y-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Create Order
          </button>
          <button 
            onClick={() => handleQuickAction('generateReport')}
            className="p-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 transform hover:-translate-y-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
} 