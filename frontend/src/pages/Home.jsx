import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-8">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-6">
          Welcome{user?.name ? `, ${user.name}` : ''}!
        </h1>
        <p className="text-gray-600 text-lg mb-8">
          This is your dashboard home page. You can start managing your inventory and orders from here.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Products</h3>
            <p className="text-3xl font-bold text-blue-700">0</p>
            <p className="mt-2 text-sm text-blue-600">Total products in inventory</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1">
            <h3 className="text-lg font-semibold text-green-900 mb-2">Orders</h3>
            <p className="text-3xl font-bold text-green-700">0</p>
            <p className="mt-2 text-sm text-green-600">Pending orders</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Revenue</h3>
            <p className="text-3xl font-bold text-purple-700">₹0</p>
            <p className="mt-2 text-sm text-purple-600">Total revenue</p>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <a href="/products" className="flex items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all">
              <div className="p-3 bg-blue-100 rounded-lg mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Manage Products</h3>
                <p className="text-sm text-gray-600">Add, edit, or remove products</p>
              </div>
            </a>

            <a href="/orders" className="flex items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all">
              <div className="p-3 bg-green-100 rounded-lg mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Manage Orders</h3>
                <p className="text-sm text-gray-600">View and process orders</p>
              </div>
            </a>

            <a href="/reports" className="flex items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all">
              <div className="p-3 bg-purple-100 rounded-lg mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Reports</h3>
                <p className="text-sm text-gray-600">Generate and view reports</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
