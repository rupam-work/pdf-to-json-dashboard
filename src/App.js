import React, { useState, useCallback } from 'react';
import { Upload, FileText, Download, Eye, EyeOff, Copy, Check } from 'lucide-react';
import './styles.css';
import { parseBankStatement } from './lib/parseBankStatement';

function App() {
  const [file, setFile] = useState(null);
  const [jsonData, setJsonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('formatted');
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFileUpload = useCallback((e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile && uploadedFile.type === 'application/pdf') {
      setFile(uploadedFile);
      setError(null);
    } else {
      setError('Please upload a valid PDF file');
    }
  }, []);

  const convertToJson = useCallback(async () => {
    if (!file) {
      setError('Please upload a PDF file first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Read PDF file
      const fileReader = new FileReader();
      
      fileReader.onload = async (e) => {
        try {
          const pdfData = e.target.result;
          
          // Load PDF.js
          const pdfjsLib = window['pdfjs-dist/build/pdf'];
          pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          
          // Load the PDF document
          const loadingTask = pdfjsLib.getDocument({data: pdfData});
          const pdf = await loadingTask.promise;
          
          let fullText = '';
          
          // Extract text from all pages
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
          }
          
          // Parse the extracted text using enhanced parser
          const parsedData = parseBankStatement(fullText);
          
          if (parsedData.status === 'success' && parsedData.data.length > 0) {
            setJsonData(parsedData);
            setError(null);
          } else {
            setError('Could not extract bank statement data from the PDF. Please ensure it\'s a valid bank statement.');
          }
        } catch (err) {
          console.error('Error parsing PDF:', err);
          setError('Error parsing PDF: ' + err.message);
        }
        setLoading(false);
      };

      fileReader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('Error reading file:', err);
      setError('Error reading file: ' + err.message);
      setLoading(false);
    }
  }, [file]);

  const downloadJson = useCallback(() => {
    if (!jsonData) return;

    const dataStr = JSON.stringify(jsonData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `bank_statement_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [jsonData]);

  const copyToClipboard = useCallback(() => {
    if (!jsonData) return;
    
    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
      });
  }, [jsonData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const renderFormattedView = () => {
    if (!jsonData || !jsonData.data || jsonData.data.length === 0) return null;
    
    const account = jsonData.data[0];
    const profile = account.Profile?.Holders?.Holder?.[0] || {};
    const summary = account.Summary || {};
    const transactions = account.Transactions?.Transaction || [];

    return (
      <div className="formatted-view">
        <div className="section">
          <h3>Account Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Bank:</span>
              <span className="value">{account.bank}</span>
            </div>
            <div className="info-item">
              <span className="label">Account Number:</span>
              <span className="value">
                {showAccountNumber ? account.maskedAccountNumber : account.maskedAccountNumber}
                <button 
                  className="toggle-visibility"
                  onClick={() => setShowAccountNumber(!showAccountNumber)}
                >
                  {showAccountNumber ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </div>
            <div className="info-item">
              <span className="label">Account Type:</span>
              <span className="value">{summary.type}</span>
            </div>
            <div className="info-item">
              <span className="label">Status:</span>
              <span className={`value status ${summary.status?.toLowerCase()}`}>{summary.status}</span>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>Account Holder Details</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Name:</span>
              <span className="value">{profile.name}</span>
            </div>
            <div className="info-item">
              <span className="label">Date of Birth:</span>
              <span className="value">{profile.dob}</span>
            </div>
            <div className="info-item">
              <span className="label">Mobile:</span>
              <span className="value">{profile.mobile}</span>
            </div>
            <div className="info-item">
              <span className="label">PAN:</span>
              <span className="value">{profile.pan}</span>
            </div>
            <div className="info-item full-width">
              <span className="label">Address:</span>
              <span className="value">{profile.address}</span>
            </div>
            {profile.email && (
              <div className="info-item">
                <span className="label">Email:</span>
                <span className="value">{profile.email}</span>
              </div>
            )}
          </div>
        </div>

        <div className="section">
          <h3>Account Summary</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Current Balance:</span>
              <span className="value highlight">{formatCurrency(summary.currentBalance)}</span>
            </div>
            <div className="info-item">
              <span className="label">Branch:</span>
              <span className="value">{summary.branch}</span>
            </div>
            <div className="info-item">
              <span className="label">IFSC Code:</span>
              <span className="value">{summary.ifscCode}</span>
            </div>
            <div className="info-item">
              <span className="label">Opening Date:</span>
              <span className="value">{summary.openingDate}</span>
            </div>
            <div className="info-item">
              <span className="label">Balance as on:</span>
              <span className="value">{new Date(summary.balanceDateTime).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>Transaction Summary</h3>
          <div className="transaction-summary">
            <div className="summary-card">
              <h4>Total Transactions</h4>
              <p>{transactions.length}</p>
            </div>
            <div className="summary-card">
              <h4>Total Credits</h4>
              <p>{formatCurrency(
                transactions
                  .filter(t => t.type === 'CREDIT')
                  .reduce((sum, t) => sum + parseFloat(t.amount), 0)
              )}</p>
            </div>
            <div className="summary-card">
              <h4>Total Debits</h4>
              <p>{formatCurrency(
                transactions
                  .filter(t => t.type === 'DEBIT')
                  .reduce((sum, t) => sum + parseFloat(t.amount), 0)
              )}</p>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>Recent Transactions</h3>
          <div className="table-container">
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction ID</th>
                  <th>Type</th>
                  <th>Mode</th>
                  <th>Amount</th>
                  <th>Balance</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(-10).reverse().map((txn, index) => (
                  <tr key={index}>
                    <td>{new Date(txn.transactionTimestamp).toLocaleDateString()}</td>
                    <td>{txn.txnId}</td>
                    <td className={`type ${txn.type.toLowerCase()}`}>{txn.type}</td>
                    <td>{txn.mode}</td>
                    <td className={txn.type === 'CREDIT' ? 'credit' : 'debit'}>
                      {formatCurrency(txn.amount)}
                    </td>
                    <td>{formatCurrency(txn.currentBalance)}</td>
                    <td className="narration">{txn.narration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>Bank Statement to JSON Converter</h1>
          <p>Convert your bank statement PDFs to structured JSON format</p>
        </header>

        <div className="upload-section">
          <div className="upload-area">
            <input
              type="file"
              id="file-upload"
              accept=".pdf"
              onChange={handleFileUpload}
              className="file-input"
            />
            <label htmlFor="file-upload" className="upload-label">
              <Upload size={48} />
              <span>Click to upload or drag and drop</span>
              <span className="file-type">PDF files only</span>
            </label>
            {file && (
              <div className="file-info">
                <FileText size={20} />
                <span>{file.name}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            className="convert-button" 
            onClick={convertToJson}
            disabled={!file || loading}
          >
            {loading ? 'Converting...' : 'Convert to JSON'}
          </button>
        </div>

        {jsonData && (
          <div className="results-section">
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'formatted' ? 'active' : ''}`}
                onClick={() => setActiveTab('formatted')}
              >
                Formatted View
              </button>
              <button 
                className={`tab ${activeTab === 'json' ? 'active' : ''}`}
                onClick={() => setActiveTab('json')}
              >
                JSON View
              </button>
            </div>

            <div className="actions">
              <button className="action-button" onClick={downloadJson}>
                <Download size={16} />
                Download JSON
              </button>
              <button className="action-button" onClick={copyToClipboard}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>

            <div className="content">
              {activeTab === 'formatted' ? (
                renderFormattedView()
              ) : (
                <pre className="json-view">
                  {JSON.stringify(jsonData, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
