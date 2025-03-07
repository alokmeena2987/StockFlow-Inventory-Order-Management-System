import { useState } from 'react';
import ReportDisplay from '../components/ReportDisplay';

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState('sales-trends');

  const reportTypes = [
    { id: 'sales-trends', name: 'Sales Trends' },
    { id: 'weekly-sales', name: 'Weekly Sales' },
    { id: 'monthly-sales', name: 'Monthly Sales' },
    { id: 'reorder-suggestions', name: 'Reorder Suggestions' },
    { id: 'product-performance', name: 'Product Performance' }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Reports & Analytics</h1>
        <div className="flex flex-wrap gap-2">
          {reportTypes.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedReport === report.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {report.name}
            </button>
          ))}
        </div>
      </div>

      <ReportDisplay reportType={selectedReport} />
    </div>
  );
} 