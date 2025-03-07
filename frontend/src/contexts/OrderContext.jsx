import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';
import toast from 'react-hot-toast';
import api, { initializeCSRF } from '../utils/api';

const OrderContext = createContext();

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
}

export function OrderProvider({ children }) {
  const { user } = useAuth();
  const { products, fetchProducts } = useProducts();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const ordersRef = useRef([]);
  const isMounted = useRef(true);

  // Initialize CSRF token when component mounts
  useEffect(() => {
    initializeCSRF();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!user?.token) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/orders');
      
      if (response.data && response.data.success) {
        setOrders(response.data.orders || []);
      } else {
        throw new Error(response.data?.message || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err.response?.data || err.message);
      setError(err.response?.data?.message || err.message || 'Failed to load orders');
      toast.error(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createOrder = useCallback(async (orderData) => {
    if (!user?.token) {
      toast.error('You must be logged in to create orders');
      return null;
    }

    try {
      // Validate product availability and stock
      for (const item of orderData.items) {
        const product = products.find(p => p._id === item.product);
        if (!product) {
          throw new Error(`Product not found: ${item.product}`);
        }
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }
      }

      const response = await api.post('/orders', orderData);

      if (response.data && response.data.success) {
        const newOrder = response.data.order;
        if (isMounted.current) {
          setOrders(prev => {
            const updated = [...prev, newOrder];
            ordersRef.current = updated;
            return updated;
          });
        }
        // Refresh products to get updated stock levels
        await fetchProducts();
        toast.success('Order created successfully');
        return newOrder;
      } else {
        throw new Error(response.data?.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to create order');
      return null;
    }
  }, [user?.token, products, fetchProducts]);

  const updateOrderStatus = useCallback(async (orderId, status) => {
    if (!user?.token) {
      toast.error('You must be logged in to update orders');
      return null;
    }

    try {
      const response = await api.patch(`/orders/${orderId}/status`, { status });

      if (response.data && response.data.success) {
        const updatedOrder = response.data.order;
        if (isMounted.current) {
          setOrders(prev => {
            const updated = prev.map(o => o._id === orderId ? updatedOrder : o);
            ordersRef.current = updated;
            return updated;
          });
        }
        toast.success('Order status updated successfully');
        return updatedOrder;
      } else {
        throw new Error(response.data?.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(error.response?.data?.message || 'Failed to update order status');
      return null;
    }
  }, [user?.token]);

  const getOrder = useCallback((orderId) => {
    return ordersRef.current.find(o => o._id === orderId) || null;
  }, []);

  const value = {
    orders,
    loading,
    error,
    fetchOrders,
    createOrder,
    updateOrderStatus,
    getOrder
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
} 