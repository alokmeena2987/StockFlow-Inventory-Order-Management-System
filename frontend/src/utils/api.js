import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Initialize CSRF token function
export const initializeCSRF = async () => {
  try {
    const response = await api.get('/csrf-token');
    if (response.data?.csrfToken) {
      api.defaults.headers.common['X-CSRF-Token'] = response.data.csrfToken;
    }
  } catch (err) {
    console.error('Failed to initialize CSRF token:', err);
  }
};

// Request interceptor for auth and CSRF
api.interceptors.request.use(
  async config => {
    // Get the token from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user?.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      } catch (err) {
        console.error('Error parsing user from localStorage:', err);
      }
    }

    // Ensure CSRF token for mutation requests
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      if (!api.defaults.headers.common['X-CSRF-Token']) {
        await initializeCSRF();
      }
      // Apply CSRF token to the request
      config.headers['X-CSRF-Token'] = api.defaults.headers.common['X-CSRF-Token'];
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor for auth and CSRF errors
api.interceptors.response.use(
  response => response,
  async error => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
    }
    
    // Handle CSRF token errors
    if (error.response?.status === 403 && error.response?.data?.message?.includes('CSRF')) {
      const originalRequest = error.config;
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        await initializeCSRF();
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export default api; 