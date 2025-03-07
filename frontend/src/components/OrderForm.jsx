import { useState, useEffect } from 'react';
import { useOrders } from '../contexts/OrderContext';
import { useProducts } from '../contexts/ProductContext';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank-transfer', label: 'Bank Transfer' }
];

function OrderForm() {
  const { createOrder, fetchOrders } = useOrders();
  const { products, fetchProducts, loading: productsLoading } = useProducts();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    customer: {
      name: '',
      email: '',
      phone: '',
      address: ''
    },
    items: [{
      product: '',
      quantity: 1
    }],
    payment: {
      method: 'cash',
      status: 'pending'
    },
    notes: ''
  });

  // Fetch products when modal is opened
  useEffect(() => {
    if (showModal) {
      fetchProducts();
    }
  }, [showModal, fetchProducts]);

  // Log products for debugging
  // useEffect(() => {
  //   if (showModal) {
  //     console.log('Available products:', products);
  //   }
  // }, [products, showModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Calculate total amount
    const totalAmount = calculateTotal();
    
    // Prepare order data with total amount
    const orderData = {
      ...formData,
      totalAmount
    };

    const success = await createOrder(orderData);
    if (success) {
      setShowModal(false);
      setFormData({
        customer: {
          name: '',
          email: '',
          phone: '',
          address: ''
        },
        items: [{
          product: '',
          quantity: 1
        }],
        payment: {
          method: 'cash',
          status: 'pending'
        },
        notes: ''
      });
      // Fetch updated orders list
      await fetchOrders();
    }
  };

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      customer: {
        ...prev.customer,
        [name]: value
      }
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: field === 'quantity' ? Number(value) : value
    };
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product: '', quantity: 1 }]
    }));
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => {
      const product = products.find(p => p._id === item.product);
      return total + (product ? product.price * item.quantity : 0);
    }, 0);
  };

  const renderProductOptions = () => {
    if (productsLoading) {
      return <option value="">Loading products...</option>;
    }

    if (!products || products.length === 0) {
      return <option value="">No products available</option>;
    }

    return (
      <>
        <option value="">Select Product</option>
        {products.map(product => (
          <option key={product._id} value={product._id}>
            {product.name} - ₹{product.price.toFixed(2)} (Stock: {product.stock})
          </option>
        ))}
      </>
    );
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
      >
        Add Order
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[800px] shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Create New Order</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Information */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-md font-medium mb-3">Customer Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.customer.name}
                      onChange={handleCustomerChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.customer.email}
                      onChange={handleCustomerChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.customer.phone}
                      onChange={handleCustomerChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.customer.address}
                      onChange={handleCustomerChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-md font-medium">Order Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-4 items-end">
                      <div className="flex-grow">
                        <label className="block text-sm font-medium text-gray-700">Product *</label>
                        <select
                          value={item.product}
                          onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        >
                          {renderProductOptions()}
                        </select>
                      </div>
                      <div className="w-32">
                        <label className="block text-sm font-medium text-gray-700">Quantity *</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          min="1"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-700 mb-2"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-right">
                  <span className="text-lg font-semibold">
                    Total: ₹{calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-md font-medium mb-3">Payment Information</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method *</label>
                  <select
                    value={formData.payment.method}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      payment: { ...prev.payment, method: e.target.value }
                    }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows="2"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default OrderForm; 