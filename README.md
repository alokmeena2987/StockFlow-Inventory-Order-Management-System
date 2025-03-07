# StockFlow - Inventory & Order Management System

StockFlow is a comprehensive inventory and order management system developed by Cloobot. It provides businesses with a modern, efficient solution for managing their inventory, orders, and business operations.

## Features

- **Inventory Management**
  - Real-time stock tracking
  - Low stock alerts
  - Product categorization
  - Batch tracking
  - Stock history and analytics

- **Order Management**
  - Order creation and tracking
  - Order status updates
  - Customer management
  - Invoice generation
  - Order history

- **Analytics & Reporting**
  - Sales analytics
  - Inventory turnover metrics
  - Revenue reports
  - PDF report generation
  - Data visualization with charts

- **User Management**
  - Role-based access control
  - Secure authentication
  - User activity logging
  - Profile management

## Technology Stack

### Frontend
- React.js with Vite
- TailwindCSS for styling
- Chart.js for data visualization
- React Router for navigation
- Axios for API communication

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT for authentication
- Winston for logging
- PDFKit for document generation

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Git

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

## API Documentation

The backend API is organized around REST principles. All requests and responses are in JSON format.

Base URL: `http://localhost:5000/api`

Key endpoints:
- `/auth` - Authentication routes
- `/products` - Product management
- `/orders` - Order management
- `/users` - User management
- `/analytics` - Analytics and reports

## Future Roadmap

Based on current market trends, StockFlow is planned to evolve with the following features:

1. **AI-Powered Inventory Optimization**
   - Demand forecasting
   - Automated reorder suggestions
   - Intelligent stock level optimization

2. **Enhanced Analytics**
   - Advanced business intelligence
   - Predictive analytics
   - Custom report builder

3. **Mobile Applications**
   - Native iOS and Android apps
   - Barcode/QR code scanning
   - Mobile inventory management

4. **Integration Capabilities**
   - E-commerce platform integrations
   - Accounting software connectivity
   - Third-party logistics (3PL) integration

5. **Sustainability Features**
   - Carbon footprint tracking
   - Sustainable supplier management
   - Waste reduction analytics

