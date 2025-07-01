import React, { useRef } from 'react';
import { useAnalytics } from '../contexts/AnalyticsContext';

export const AnalyticsDashboard: React.FC = () => {
  const { events, clearEvents } = useAnalytics();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export analytics data as JSON
  const handleExport = () => {
    const data = JSON.stringify(events, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chainbot-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import analytics data from JSON
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          // Merge imported events with current events
          const merged = [...events, ...imported].sort((a, b) => a.timestamp - b.timestamp);
          localStorage.setItem('chainbot-analytics-events', JSON.stringify(merged));
          window.location.reload();
        } else {
          alert('Invalid analytics data format.');
        }
      } catch (err) {
        alert('Failed to import analytics data.');
      }
    };
    reader.readAsText(file);
  };

  // Clear all analytics data
  const handleClearAll = () => {
    if (window.confirm('This will permanently delete all analytics and audit log data. Continue?')) {
      clearEvents();
      localStorage.removeItem('chainbot-analytics-events');
      window.location.reload();
    }
  };

  // Count events by type
  const eventCounts = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {});

  // Audit log events
  const auditEvents = events.filter(e => e.type === 'audit');

  return (
    <div className="p-8 text-white">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleExport}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          Export Analytics
        </button>
        <label className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded cursor-pointer">
          Import Analytics
          <input
            type="file"
            accept="application/json"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
        </label>
        <button
          onClick={handleClearAll}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
        >
          Clear All Data
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Event Counts</h2>
        <ul className="mb-4">
          {Object.entries(eventCounts).map(([type, count]) => (
            <li key={type} className="mb-1">
              <span className="font-mono bg-gray-800 px-2 py-1 rounded mr-2">{type}</span>
              <span className="text-blue-400 font-bold">{count}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-2">Event Log</h2>
        <div className="overflow-x-auto bg-gray-900 rounded p-4 max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left pr-4">Time</th>
                <th className="text-left pr-4">Type</th>
                <th className="text-left">Payload</th>
              </tr>
            </thead>
            <tbody>
              {events.slice().reverse().map((event, idx) => (
                <tr key={idx} className="border-b border-gray-800 last:border-b-0">
                  <td className="pr-4 text-gray-400">{new Date(event.timestamp).toLocaleTimeString()}</td>
                  <td className="pr-4 font-mono text-blue-300">{event.type}</td>
                  <td className="font-mono text-gray-300">{event.payload ? JSON.stringify(event.payload) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-2 mt-8">Audit Log <span className="text-xs text-gray-400">({auditEvents.length} events)</span></h2>
        <div className="overflow-x-auto bg-gray-900 rounded p-4 max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left pr-4">Time</th>
                <th className="text-left pr-4">Action</th>
                <th className="text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.slice().reverse().map((event, idx) => (
                <tr key={idx} className="border-b border-gray-800 last:border-b-0">
                  <td className="pr-4 text-gray-400">{new Date(event.timestamp).toLocaleTimeString()}</td>
                  <td className="pr-4 font-mono text-green-300">{event.payload?.action}</td>
                  <td className="font-mono text-gray-300">{event.payload ? JSON.stringify(event.payload) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}; 