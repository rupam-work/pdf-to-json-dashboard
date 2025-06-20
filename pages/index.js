import React, { useState, useEffect } from 'react';

// FI Type badge colors
const FI_TYPE_COLORS = {
  deposit: '#4CAF50',
  mutualFund: '#2196F3',
  equity: '#FF9800',
  etf: '#9C27B0'
};

// Format currency
const formatCurrency = (amount) => {
  if (!amount) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount);
};

// Summary Component
const Summary = ({ data }) => {
  if (!data || !data.data || !data.data[0]) return null;
  
  const fiData = data.data[0];
  const fiType = fiData.fiType;
  
  return (
    <div style={{
      background: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, flex: 1 }}>Summary</h3>
        <span style={{
          background: FI_TYPE_COLORS[fiType] || '#666',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          {fiType?.toUpperCase()}
        </span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        {fiType === 'deposit' && (
          <>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Account Number</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{fiData.maskedAccountNumber || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Bank</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{fiData.bank || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Balance</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{formatCurrency(fiData.Summary?.currentBalance)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>IFSC</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{fiData.Summary?.ifscCode || '-'}</div>
            </div>
          </>
        )}
        
        {fiType === 'mutualFund' && (
          <>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Folio Number</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{fiData.maskedFolioNumber || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>AMC</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{fiData.amc || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Current Value</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{formatCurrency(fiData.Summary?.currentValue)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Units</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{fiData.Summary?.totalUnits || '-'}</div>
            </div>
          </>
        )}
        
        {(fiType === 'equity' || fiType === 'etf') && (
          <>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Demat ID</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{fiData.maskedDematId || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Depository</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{fiData.depository || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Portfolio Value</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{formatCurrency(fiData.Summary?.currentValue)}</div>
            </div>
            {fiType === 'etf' && (
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Units</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{fiData.Summary?.totalUnits || '-'}</div>
              </div>
            )}
          </>
        )}
      </div>
      
      {fiData.Profile?.Holders?.Holder?.[0]?.name && (
        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e0e0e0' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Account Holder</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{fiData.Profile.Holders.Holder[0].name}</div>
        </div>
      )}
    </div>
  );
};

// JSON Viewer Component
const JsonViewer = ({ data }) => {
  const [expanded, setExpanded] = useState(false);
  
  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.data[0].fiType}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div style={{
      background: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{ margin: 0, flex: 1 }}>JSON Output</h4>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: '#2196F3',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px',
            fontSize: '14px'
          }}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
        <button
          onClick={downloadJson}
          style={{
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Download JSON
        </button>
      </div>
      <pre style={{
        background: 'white',
        padding: '15px',
        borderRadius: '4px',
        overflow: 'auto',
        maxHeight: expanded ? 'none' : '200px',
        margin: 0,
        fontSize: '12px',
        lineHeight: '1.5'
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

// File Result Component
const FileResult = ({ file }) => {
  if (file.error) {
    return (
      <div style={{
        background: '#ffebee',
        border: '1px solid #ffcdd2',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#c62828', margin: '0 0 10px 0' }}>{file.name}</h3>
        <p style={{ color: '#d32f2f', margin: 0 }}>Error: {file.error}</p>
      </div>
    );
  }
  
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ margin: '0 0 20px 0' }}>{file.name}</h3>
      <Summary data={file.data} />
      <JsonViewer data={file.data} />
    </div>
  );
};

// Main Component
export default function Home() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fiTypes, setFiTypes] = useState([]);

  useEffect(() => {
    // Fetch supported FI types
    const fetchFiTypes = async () => {
      try {
        const res = await fetch('/api/fi-types');
        const data = await res.json();
        setFiTypes(data.types);
      } catch (err) {
        console.error('Failed to fetch FI types:', err);
      }
    };
    fetchFiTypes();
  }, []);

  const handleChange = (e) => {
    setError('');
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;
    
    setLoading(true);
    setError('');
    setResults([]);
    
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      setResults(data.files);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #e0e0e0', padding: '20px 0' }}>
        <div style={{ margin: '0 auto', maxWidth: 1200, padding: '0 20px' }}>
          <h1 style={{ margin: 0, color: '#333' }}>Financial Document Parser</h1>
          <p style={{ margin: '10px 0 0 0', color: '#666' }}>
            Upload PDF statements from Indian banks, mutual funds, equities, and ETFs to extract structured data
          </p>
        </div>
      </div>
      
      <div style={{ margin: '40px auto', maxWidth: 1200, padding: '0 20px' }}>
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '30px',
          marginBottom: '40px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 20px 0' }}>Upload Documents</h2>
          
          <form onSubmit={handleSubmit}>
            <div style={{
              border: '2px dashed #ddd',
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              background: '#fafafa',
              marginBottom: '20px'
            }}>
              <input
                type="file"
                multiple
                accept="application/pdf,image/*"
                onChange={handleChange}
                style={{
                  display: 'none'
                }}
                id="file-input"
              />
              <label
                htmlFor="file-input"
                style={{
                  background: '#2196F3',
                  color: 'white',
                  padding: '12px 30px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-block',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Select Files
              </label>
              
              {files.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <p style={{ margin: '0 0 10px 0', color: '#666' }}>
                    {files.length} file(s) selected:
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {files.map((file, idx) => (
                      <li key={idx} style={{ color: '#333', marginBottom: '5px' }}>
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <button
                type="submit"
                disabled={files.length === 0 || loading}
                style={{
                  background: files.length > 0 && !loading ? '#4CAF50' : '#ccc',
                  color: 'white',
                  border: 'none',
                  padding: '12px 40px',
                  borderRadius: '6px',
                  cursor: files.length > 0 && !loading ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'Processing...' : 'Extract Data'}
              </button>
            </div>
          </form>
          
          {error && (
            <div style={{
              background: '#ffebee',
              border: '1px solid #ffcdd2',
              borderRadius: '4px',
              padding: '15px',
              marginTop: '20px',
              color: '#c62828'
            }}>
              Error: {error}
            </div>
          )}
        </div>
        
        {results.length > 0 && (
          <div>
            <h2 style={{ marginBottom: '20px' }}>Results</h2>
            {results.map((file, idx) => (
              <FileResult key={idx} file={file} />
            ))}
          </div>
        )}
        
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '30px',
          marginTop: '40px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3>Supported Financial Institutions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
            <div>
              <h4 style={{ color: FI_TYPE_COLORS.deposit }}>Banks (Deposits)</h4>
              <ul style={{ color: '#666', fontSize: '14px' }}>
                <li>SBI, HDFC, ICICI, Axis</li>
                <li>Kotak, PNB, Canara</li>
                <li>Bank of Baroda, Union Bank</li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: FI_TYPE_COLORS.mutualFund }}>Mutual Funds</h4>
              <ul style={{ color: '#666', fontSize: '14px' }}>
                <li>HDFC, ICICI Prudential</li>
                <li>SBI, Axis, Kotak</li>
                <li>Aditya Birla, Nippon, Franklin</li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: FI_TYPE_COLORS.equity }}>Equity Brokers</h4>
              <ul style={{ color: '#666', fontSize: '14px' }}>
                <li>Zerodha, Upstox, Groww</li>
                <li>Angel, ICICI Direct</li>
                <li>HDFC Securities, Kotak Securities</li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: FI_TYPE_COLORS.etf }}>ETFs</h4>
              <ul style={{ color: '#666', fontSize: '14px' }}>
                <li>Nifty ETF, Sensex ETF</li>
                <li>Gold ETF, Liquid ETF</li>
                <li>Index Funds</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
