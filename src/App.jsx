import React, { useState } from 'react';
import ScreenshotProcessor from './components/ScreenshotProcessor';
import EnhancedDashboard from './components/EnhancedDashboard';
import { FileImage, BarChart3, Tabs, Upload, Brain, Settings } from 'lucide-react';

function App() {
  const [extractedData, setExtractedData] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');

  const handleDataExtracted = (data) => {
    setExtractedData(data);
    setActiveTab('dashboard');
  };

  const resetApp = () => {
    setExtractedData(null);
    setActiveTab('upload');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Brain className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">
                AI Portfolio Extractor
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'upload'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                disabled={!extractedData}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'dashboard' && extractedData
                    ? 'bg-blue-100 text-blue-700'
                    : extractedData
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto py-8">
        {activeTab === 'upload' && (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Transform Your Portfolio Screenshots into Structured Data
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Upload a screenshot of your mutual fund portfolio and let our AI extract, analyze, 
                and structure all the information into a comprehensive JSON format.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg p-6 shadow-md">
                  <FileImage className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Upload Screenshot</h3>
                  <p className="text-gray-600 text-sm">
                    Simply upload an image of your portfolio dashboard from any mutual fund platform
                  </p>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-md">
                  <Brain className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">AI Processing</h3>
                  <p className="text-gray-600 text-sm">
                    Our AI analyzes the image and extracts all relevant financial data intelligently
                  </p>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-md">
                  <BarChart3 className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Structured Data</h3>
                  <p className="text-gray-600 text-sm">
                    Get a complete JSON with profile, holdings, transactions, and portfolio analytics
                  </p>
                </div>
              </div>
            </div>

            {/* Screenshot Processor */}
            <ScreenshotProcessor onDataExtracted={handleDataExtracted} />

            {/* Features Section */}
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8 mt-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                What Our AI Extracts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Profile Information</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Account holder details</li>
                    <li>• Contact information</li>
                    <li>• KYC status and compliance</li>
                    <li>• Account numbers and folios</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Portfolio Holdings</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Fund names and AMC details</li>
                    <li>• Current NAV and units held</li>
                    <li>• Investment values and returns</li>
                    <li>• Scheme categories and types</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Financial Summary</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Total invested amount</li>
                    <li>• Current portfolio value</li>
                    <li>• Overall returns and percentages</li>
                    <li>• Performance metrics</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Transaction History</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Purchase and redemption details</li>
                    <li>• Transaction dates and amounts</li>
                    <li>• NAV at transaction time</li>
                    <li>• Units allocated per transaction</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && extractedData && (
          <div>
            <div className="mb-6 max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Portfolio Dashboard</h2>
                  <p className="text-gray-600">
                    AI-extracted data from your portfolio screenshot
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={resetApp}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Upload New Screenshot
                  </button>
                  <button
                    onClick={() => {
                      const dataStr = JSON.stringify(extractedData, null, 2);
                      const dataBlob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `portfolio_data_${new Date().toISOString().split('T')[0]}.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Download JSON
                  </button>
                </div>
              </div>
            </div>
            <EnhancedDashboard data={extractedData} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">
              Powered by AI • Built for Portfolio Analysis • 
              <span className="text-blue-600 ml-1">Secure & Private</span>
            </p>
            <div className="mt-4 flex justify-center space-x-6 text-sm text-gray-500">
              <span>• No data stored on servers</span>
              <span>• Local processing only</span>
              <span>• Open source ready</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;