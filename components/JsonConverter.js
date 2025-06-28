import React, { useState, useCallback } from 'react';
import { Upload, File, Download, Copy, CheckCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const JsonConverter = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jsonData, setJsonData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedTab, setSelectedTab] = useState('formatted');

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0];
      if (uploadedFile.type === 'application/pdf' || uploadedFile.type.startsWith('image/')) {
        setFile(uploadedFile);
        setError(null);
        setJsonData(null);
      } else {
        setError('Please upload a PDF or image file (JPG, JPEG, PNG, GIF, BMP)');
        setFile(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp']
    },
    multiple: false
  });

  const handleConvert = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/convert-to-json', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setJsonData(data);
    } catch (err) {
      setError(err.message || 'An error occurred while converting the file');
    } finally {
      setLoading(false);
    }
  };

  const downloadJson = () => {
    if (jsonData) {
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'financial-data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const copyToClipboard = async () => {
    if (jsonData) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const renderJsonViewer = () => {
    if (!jsonData) return null;

    if (selectedTab === 'raw') {
      return (
        <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono">
          {JSON.stringify(jsonData, null, 2)}
        </pre>
      );
    }

    // Formatted view
    const data = jsonData.data?.[0] || {};
    const fiType = data.fiType || 'UNKNOWN';

    return (
      <div className="space-y-6">
        {/* Header Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-2">Document Information</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="font-medium">Type:</span> {fiType}</div>
            <div><span className="font-medium">Bank/Institution:</span> {data.bank || 'N/A'}</div>
            <div><span className="font-medium">Account:</span> {data.maskedAccountNumber || 'N/A'}</div>
            <div><span className="font-medium">Status:</span> {jsonData.status || 'N/A'}</div>
          </div>
        </div>

        {/* Profile Section */}
        {data.Profile && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Profile Information</h3>
            {data.Profile.Holders?.Holder?.map((holder, index) => (
              <div key={index} className="grid grid-cols-2 gap-2 text-sm mb-4">
                <div><span className="font-medium">Name:</span> {holder.name || 'N/A'}</div>
                <div><span className="font-medium">DOB:</span> {holder.dob || 'N/A'}</div>
                <div><span className="font-medium">Mobile:</span> {holder.mobile || 'N/A'}</div>
                <div><span className="font-medium">Email:</span> {holder.email || 'N/A'}</div>
                <div><span className="font-medium">PAN:</span> {holder.pan || 'N/A'}</div>
                <div className="col-span-2"><span className="font-medium">Address:</span> {holder.address || 'N/A'}</div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Section */}
        {data.Summary && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {fiType === 'DEPOSIT' && (
                <>
                  <div><span className="font-medium">Balance:</span> ₹{data.Summary.currentBalance || 'N/A'}</div>
                  <div><span className="font-medium">Type:</span> {data.Summary.type || 'N/A'}</div>
                  <div><span className="font-medium">Branch:</span> {data.Summary.branch || 'N/A'}</div>
                  <div><span className="font-medium">IFSC:</span> {data.Summary.ifscCode || 'N/A'}</div>
                  <div><span className="font-medium">Status:</span> {data.Summary.status || 'N/A'}</div>
                </>
              )}
              {(fiType === 'EQUITIES' || fiType === 'MUTUAL_FUNDS') && (
                <>
                  <div><span className="font-medium">Current Value:</span> ₹{data.Summary.currentValue || 'N/A'}</div>
                  {data.Summary.costValue && (
                    <div><span className="font-medium">Cost Value:</span> ₹{data.Summary.costValue}</div>
                  )}
                </>
              )}
            </div>

            {/* Holdings */}
            {data.Summary?.Investment?.Holdings?.Holding?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Holdings</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {fiType === 'EQUITIES' && (
                          <>
                            <th className="text-left p-2">ISIN</th>
                            <th className="text-left p-2">Units</th>
                            <th className="text-left p-2">Price</th>
                          </>
                        )}
                        {fiType === 'MUTUAL_FUNDS' && (
                          <>
                            <th className="text-left p-2">Scheme</th>
                            <th className="text-left p-2">NAV</th>
                            <th className="text-left p-2">Units</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {data.Summary.Investment.Holdings.Holding.map((holding, idx) => (
                        <tr key={idx} className="border-b">
                          {fiType === 'EQUITIES' && (
                            <>
                              <td className="p-2">{holding.isin}</td>
                              <td className="p-2">{holding.units}</td>
                              <td className="p-2">₹{holding.lastTradedPrice}</td>
                            </>
                          )}
                          {fiType === 'MUTUAL_FUNDS' && (
                            <>
                              <td className="p-2">{holding.schemeCode}</td>
                              <td className="p-2">₹{holding.nav}</td>
                              <td className="p-2">{holding.closingUnits}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transactions Section */}
        {data.Transactions?.Transaction?.length > 0 && (
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Recent Transactions</h3>
            <div className="text-sm mb-2">
              <span className="font-medium">Period:</span> {data.Transactions.startDate || 'N/A'} to {data.Transactions.endDate || 'N/A'}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Amount</th>
                    <th className="text-left p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {data.Transactions.Transaction.slice(0, 10).map((txn, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{txn.transactionDate}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          txn.type === 'CREDIT' || txn.type === 'BUY' ? 'bg-green-200' : 'bg-red-200'
                        }`}>
                          {txn.type}
                        </span>
                      </td>
                      <td className="p-2">₹{txn.amount}</td>
                      <td className="p-2 text-xs">{txn.narration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.Transactions.Transaction.length > 10 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing 10 of {data.Transactions.Transaction.length} transactions
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Financial Document to JSON Converter
          </h1>
          
          <div className="mb-8">
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                {isDragActive ? 
                  'Drop the file here...' : 
                  'Drag & drop a PDF or image file here, or click to select'
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: PDF, JPG, JPEG, PNG, GIF, BMP (Max 50MB)
              </p>
            </div>

            {file && (
              <div className="mt-4 flex items-center justify-between bg-gray-50 p-3 rounded">
                <div className="flex items-center">
                  <File className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">{file.name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setJsonData(null);
                    setError(null);
                  }}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <button
              onClick={handleConvert}
              disabled={!file || loading}
              className={`mt-4 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                !file || loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {loading ? 'Converting...' : 'Convert to JSON'}
            </button>
          </div>

          {jsonData && (
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Converted JSON</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedTab('formatted')}
                    className={`px-3 py-1 text-sm rounded ${
                      selectedTab === 'formatted' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Formatted
                  </button>
                  <button
                    onClick={() => setSelectedTab('raw')}
                    className={`px-3 py-1 text-sm rounded ${
                      selectedTab === 'raw' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Raw JSON
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                  >
                    {copied ? <CheckCircle className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={downloadJson}
                    className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </button>
                </div>
              </div>

              {renderJsonViewer()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JsonConverter;
