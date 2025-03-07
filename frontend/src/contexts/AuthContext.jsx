import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    try {
      const parsedUser = savedUser ? JSON.parse(savedUser) : null;
      if (parsedUser?.token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`;
      }
      return parsedUser;
    } catch (error) {
      console.error('Error parsing saved user:', error);
      localStorage.removeItem('user');
      return null;
    }
  });
  
  const [loading, setLoading] = useState(false);

  // Configure axios defaults
  axios.defaults.baseURL = 'http://localhost:5000/api';
  axios.defaults.headers.post['Content-Type'] = 'application/json';
  axios.defaults.headers.put['Content-Type'] = 'application/json';

  useEffect(() => {
    if (user?.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [user]);

  // Enhanced user state management
  const updateUserState = (userData) => {
    if (!userData) {
      setUser(null);
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      return;
    }

    // Ensure all required fields are present
    const completeUserData = {
      ...userData,
      token: userData.token,
      email: userData.email,
      name: userData.name,
      _id: userData._id
    };

    // Update state and storage atomically
    setUser(completeUserData);
    localStorage.setItem('user', JSON.stringify(completeUserData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${completeUserData.token}`;
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await axios.post('/auth/login', { email, password });
      
      if (!response.data || !response.data.token) {
        throw new Error('Invalid login response');
      }

      // Ensure we have a complete user object with all fields from the response
      const userData = {
        token: response.data.token,
        email: response.data.user.email,
        name: response.data.user.name,
        _id: response.data.user.id || response.data.user._id
      };

      updateUserState(userData);
      toast.success('Login successful');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      updateUserState(null);
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    updateUserState(null);
    toast.success('Logged out successfully');
  };

  const updateUserData = async (updateData) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user'));
      if (!currentUser?.token) {
        throw new Error('No authentication token found');
      }

      // Log update request for debugging
      // console.log('Profile update request:', updateData);

      const response = await axios.put('/auth/profile', {
        name: updateData.name,
        email: updateData.email,
        currentPassword: updateData.currentPassword,
        newPassword: updateData.newPassword
      });

      // Log response for debugging
      // console.log('Profile update response:', response.data);

      // Create complete user object with current token and updated data
      const completeUserData = {
        ...currentUser,
        name: response.data.user.name,
        email: response.data.user.email,
        token: currentUser.token // Keep the current token
      };

      // Update state and storage
      setUser(completeUserData);
      localStorage.setItem('user', JSON.stringify(completeUserData));

      // Update axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${completeUserData.token}`;

      // Only show one success message
      if (!response.data.message) {
        toast.success('Profile updated successfully');
      }
      return true;
    } catch (error) {
      console.error('Profile update error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // Handle specific error cases
      let errorMessage;
      if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
        updateUserState(null); // Force logout
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        const errors = error.response.data.errors;
        errorMessage = Array.isArray(errors) 
          ? errors.map(e => e.msg).join(', ')
          : 'Invalid profile data. Please check your input.';
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your network.';
      } else {
        errorMessage = 'Failed to update profile. Please try again.';
      }

      toast.error(errorMessage);
      return false;
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const response = await axios.post('/auth/signup', userData);
      
      if (!response.data || !response.data.token) {
        throw new Error('Invalid registration response');
      }

      const newUser = {
        token: response.data.token,
        email: response.data.user.email,
        name: response.data.user.name,
        _id: response.data.user.id || response.data.user._id
      };

      updateUserState(newUser);
      toast.success('Registration successful');
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    updateUserData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 