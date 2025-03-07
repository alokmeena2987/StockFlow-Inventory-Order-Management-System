import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function SupplierRecommendations({ productId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (productId) {
      fetchRecommendations();
    }
  }, [productId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `http://localhost:5000/api/ai/recommendations/supplier/${productId}`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data || !response.data.recommendations) {
        throw new Error('Invalid response format');
      }

      setRecommendations(response.data);
    } catch (error) {
      console.error('Error fetching supplier recommendations:', error);
      setError(error.message || 'Failed to fetch supplier recommendations');
      toast.error('Failed to fetch supplier recommendations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error</h3>
        <p className="text-red-600 mt-1">{error}</p>
        <button
          onClick={fetchRecommendations}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!recommendations || !recommendations.recommendations) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-yellow-800 font-medium">No Recommendations</h3>
        <p className="text-yellow-600 mt-1">No supplier recommendations available at this time.</p>
      </div>
    );
  }

  const { product, recommendations: recs } = recommendations;

  return (
    <div className="bg-white shadow rounded-lg p-4 sm:p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        AI Recommendations for {product?.name || 'Product'}
      </h3>

      {/* Summary */}
      <div className="mb-6">
        <p className="text-gray-600">{recs.summary || 'No summary available'}</p>
      </div>

      {/* Supplier Recommendations */}
      {Array.isArray(recs.recommendedSuppliers) && recs.recommendedSuppliers.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <h4 className="text-base sm:text-md font-medium text-gray-900 mb-2 sm:mb-3">Recommended Suppliers</h4>
          <div className="space-y-3 sm:space-y-4">
            {recs.recommendedSuppliers.map((supplier, index) => (
              <div key={index} className="border rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
                  <h5 className="text-sm sm:text-base font-medium mb-2 sm:mb-0">{supplier.supplier || 'Unknown Supplier'}</h5>
                  <span className="text-xs sm:text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block">
                    Score: {supplier.score || 'N/A'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-2">{supplier.reasoning || 'No reasoning provided'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-500">Price Analysis:</span>
                    <p>{supplier.priceAnalysis || 'No price analysis available'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Reliability Score:</span>
                    <p>{supplier.reliabilityScore ? `${supplier.reliabilityScore}/10` : 'N/A'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Recommendations */}
      {recs.orderRecommendations && (
        <div className="mb-4 sm:mb-6">
          <h4 className="text-base sm:text-md font-medium text-gray-900 mb-2 sm:mb-3">Order Recommendations</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-gray-50 p-3 sm:p-4 rounded-lg">
            <div>
              <span className="text-xs sm:text-sm text-gray-500">Optimal Quantity:</span>
              <p className="text-sm sm:text-base font-medium">{recs.orderRecommendations.optimalQuantity || 0} units</p>
            </div>
            <div>
              <span className="text-xs sm:text-sm text-gray-500">Best Time to Order:</span>
              <p className="text-sm sm:text-base font-medium">{recs.orderRecommendations.timing || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-xs sm:text-sm text-gray-500">Estimated Cost:</span>
              <p className="text-sm sm:text-base font-medium">₹{(recs.orderRecommendations.estimatedCost || 0).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-xs sm:text-sm text-gray-500">Potential Savings:</span>
              <p className="text-sm sm:text-base font-medium text-green-600">₹{(recs.orderRecommendations.potentialSavings || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actionable Insights */}
      {Array.isArray(recs.actionableInsights) && recs.actionableInsights.length > 0 && (
        <div>
          <h4 className="text-base sm:text-md font-medium text-gray-900 mb-2 sm:mb-3">Action Items</h4>
          <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-gray-600">
            {recs.actionableInsights.map((insight, index) => (
              <li key={index} className="break-words">{insight}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 