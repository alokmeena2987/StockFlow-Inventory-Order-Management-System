import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import api, { initializeCSRF } from '../utils/api';

const ProductContext = createContext();

export function useProducts() {
  return useContext(ProductContext);
}

export function ProductProvider({ children }) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize CSRF token when component mounts
  useEffect(() => {
    initializeCSRF();
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!user?.token) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/products');
      
      if (response.data && response.data.success) {
        setProducts(response.data.products || []);
      } else {
        throw new Error(response.data?.message || 'Failed to fetch products');
      }
    } catch (err) {
      console.error('Failed to fetch products:', err.response?.data || err.message);
      setError(err.response?.data?.message || err.message || 'Failed to load products');
      toast.error(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addProduct = async (productData) => {
    if (!user?.token) {
      toast.error('Please login to add products');
      return null;
    }

    try {
      const product = {
        ...productData,
        price: Number(productData.price),
        stock: Number(productData.stock)
      };

      const response = await api.post('/products', product);
      
      if (response.data && response.data.success) {
        const newProduct = response.data.product;
        setProducts(prev => [...prev, newProduct]);
        toast.success('Product added successfully');
        return newProduct;
      } else {
        throw new Error(response.data?.message || 'Failed to add product');
      }
    } catch (err) {
      console.error('Error adding product:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Failed to add product');
      return null;
    }
  };

  const updateProduct = async (productId, productData) => {
    if (!user?.token) {
      toast.error('Please login to update products');
      return null;
    }

    try {
      const updateData = {
        ...productData,
        ...(productData.price && { price: Number(productData.price) }),
        ...(typeof productData.stock === 'number' && { stock: Number(productData.stock) })
      };

      const response = await api.put(`/products/${productId}`, updateData);
      
      if (response.data && response.data.success) {
        const updatedProduct = response.data.product;
        setProducts(prev => prev.map(p => p._id === productId ? updatedProduct : p));
        toast.success('Product updated successfully');
        return updatedProduct;
      } else {
        throw new Error(response.data?.message || 'Failed to update product');
      }
    } catch (err) {
      console.error('Error updating product:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Failed to update product');
      return null;
    }
  };

  const deleteProduct = async (productId) => {
    if (!user?.token) {
      toast.error('Please login to delete products');
      return false;
    }

    try {
      const response = await api.delete(`/products/${productId}`);
      
      if (response.data && response.data.success) {
        setProducts(prev => prev.filter(p => p._id !== productId));
        toast.success('Product deleted successfully');
        return true;
      } else {
        throw new Error(response.data?.message || 'Failed to delete product');
      }
    } catch (err) {
      console.error('Error deleting product:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Failed to delete product');
      return false;
    }
  };

  const updateStock = async (productId, quantity) => {
    try {
      const product = products.find(p => p._id === productId);
      if (!product) return null;

      const newStock = Math.max(0, product.stock + quantity);
      const response = await api.patch(`/products/${productId}/stock`, { stock: newStock });
      
      if (response.data && response.data.success) {
        const updatedProduct = response.data.product;
        setProducts(prev => prev.map(p => p._id === productId ? updatedProduct : p));
        return updatedProduct;
      } else {
        throw new Error(response.data?.message || 'Failed to update stock');
      }
    } catch (err) {
      console.error('Error updating stock:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Failed to update stock');
      return null;
    }
  };

  const value = {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    fetchProducts
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
} 