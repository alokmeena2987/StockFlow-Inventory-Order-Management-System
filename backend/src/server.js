import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';

// Route Imports
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import orderRoutes from './routes/order.routes.js';
import reportRoutes from './routes/report.routes.js';
import aiRoutes from './routes/ai.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

// Middleware Imports
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { authMiddleware } from './middleware/auth.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173', // React app's URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials',
    'Cache-Control'
  ],
  exposedHeaders: ['X-CSRF-Token']
}));

// Enable pre-flight requests for all routes
app.options('*', cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

// CSRF protection setup
const csrfProtection = csrf({
  cookie: {
    key: 'XSRF-TOKEN',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  }
});

// Apply CSRF protection to all routes except auth and CSRF token endpoint
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth/') || req.path === '/api/csrf-token') {
    next();
  } else {
    csrfProtection(req, res, next);
  }
});

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
  csrfProtection(req, res, (err) => {
    if (err) {
      console.error('CSRF initialization error:', err);
      return res.status(500).json({ message: 'Failed to initialize CSRF token' });
    }
    res.json({ csrfToken: req.csrfToken() });
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/orders', authMiddleware, orderRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

// Error Handlers
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      // console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

startServer();