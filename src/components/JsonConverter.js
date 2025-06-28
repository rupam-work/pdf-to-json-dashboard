import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Eye, Copy, AlertCircle, Image } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Tesseract from 'tesseract.js';

const JsonConverter = () => {
  const [file, setFile] = useState(null);
  const [jsonData, setJsonData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const fileInputRef = useRef(null);

  const comprehensiveFieldStructure = {
    deposit: {
      linkReferenceNumber: '',
      maskedAccountNumber: '',
      fiType: 'DEPOSIT',
      bank: '',
      Profile: {
        Holders: {
          type: '',
          Holder: [{
            name: '',
            dob: '',
            mobile: '',
            email: '',
            address: '',
            pan: '',
            nominee: '',
            landline: '',
            ckycCompliance: ''
          }]
        }
      },
      Summary: {
        currentBalance: '',
        currency: '',
        exchgeRate: '',
        balanceDateTime: '',
        type: '',
        branch: '',
        facility: '',
        ifscCode: '',
        micrCode: '',
        openingDate: '',
        currentODLimit: '',
        drawingLimit: '',
        status: '',
        Pending: []
      },
      Transactions: {
        startDate: '',
        endDate: '',
        Transaction: []
      }
    },
    equities: {
      linkReferenceNumber: '',
      maskedAccountNumber: '',
      fiType: 'EQUITIES',
      bank: '',
      Profile: {
        Holders: {
          Holder: [{
            dob: '',
            pan: '',
            name: '',
            email: '',
            mobile: '',
            address: '',
            dematId: '',
            nominee: ''
          }]
        }
      },
      Summary: {
        Investment: {
          Holdings: {
            Holding: []
          }
        },
        currentValue: ''
      },
      Transactions: {
        endDate: '',
        startDate: '',
        Transaction: []
      }
    },
    mutualFunds: {
      linkReferenceNumber: '',
      maskedAccountNumber: '',
      fiType: 'MUTUAL_FUNDS',
      bank: '',
      Profile: {
        Holders: {
          type: '',
          Holder: [{
            dob: '',
            pan: '',
            name: '',
            email: '',
            mobile: '',
            address: '',
            dematId: '',
            folioNo: '',
            nominee: '',
            landline: '',
            kycCompliance: ''
          }]
        }
      },
      Summary: {
        costValue: '',
        Investment: {
          Holdings: {
            Holding: []
          }
        },
        currentValue: ''
      },
      Transactions: {
        endDate: '',
        startDate: '',
        Transaction: []
      }
    }
  };

  const extractDataFromImage = async (imageFile) => {
    try {
      const result = await Tesseract.recognize(imageFile, 'eng', {
        logger: m => console.log(m)
      });
      return result.data.text;
    } catch (err) {
      throw new Error('Failed to extract text from image: ' + err.message);
    }
  };

  const extractDataFromPDF = async (pdfFile) => {
    try {
      const pdfjsLib = window.pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      return fullText;
    } catch (err) {
      throw new Error('Failed to extract text from PDF: ' + err.message);
    }
  };

  const parseFinancialData = (text) => {
    const data = {};
    
    // Detect document type
    const documentType = detectDocumentType(text);
    
    // Use appropriate template based on document type
    let template = {};
    if (documentType === 'deposit' || documentType === 'bank_statement') {
      template = comprehensiveFieldStructure.deposit;
    } else if (documentType === 'equities' || documentType === 'demat') {
      template = comprehensiveFieldStructure.equities;
    } else if (documentType === 'mutualFunds') {
      template = comprehensiveFieldStructure.mutualFunds;
    }

    // Extract and map data
    const extractedData = extractFieldsFromText(text, documentType);
    
    // Map extracted data to template structure
    return mapToTemplate(extractedData, template);
  };

  const detectDocumentType = (text) => {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('savings') || textLower.includes('current balance') || 
        textLower.includes('ifsc') || textLower.includes('branch')) {
      return 'deposit';
    } else if (textLower.includes('demat') || textLower.includes('isin') || 
               textLower.includes('holdings') || textLower.includes('shares')) {
      return 'equities';
    } else if (textLower.includes('mutual fund') || textLower.includes('nav') || 
               textLower.includes('folio') || textLower.includes('units')) {
      return 'mutualFunds';
    }
    
    return 'deposit'; // default
  };

  const extractFieldsFromText = (text, documentType) => {
    const extracted = {};
    
    // Common patterns
    const patterns = {
      name: /(?:name|holder)[\s:]+([A-Za-z\s]+?)(?:\n|$)/i,
      pan: /(?:pan|pan\s*no)[\s:]+([A-Z]{5}[0-9]{4}[A-Z])/i,
      mobile: /(?:mobile|phone|contact)[\s:]+(?:\+91)?[\s-]?([0-9]{10})/i,
      email: /(?:email)[\s:]+([^\s@]+@[^\s@]+\.[^\s@]+)/i,
      dob: /(?:dob|date\s*of\s*birth)[\s:]+(\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
      address: /(?:address)[\s:]+(.+?)(?=\n(?:email|mobile|pan|$))/is,
      accountNumber: /(?:account\s*(?:no|number)|a\/c)[\s:]+([X\d]+)/i,
      ifsc: /(?:ifsc|ifsc\s*code)[\s:]+([A-Z]{4}[0-9]{7})/i,
      branch: /(?:branch)[\s:]+([^\n]+)/i,
      balance: /(?:current\s*balance|available\s*balance)[\s:]+(?:rs\.?|inr)?[\s]*([\d,]+\.?\d*)/i,
      date: /(\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/g,
      amount: /(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d{2})/g,
      transactionType: /(?:credit|debit|buy|sell|deposit|withdrawal)/gi
    };

    // Extract basic fields
    Object.keys(patterns).forEach(key => {
      const match = text.match(patterns[key]);
      if (match) {
        extracted[key] = Array.isArray(match) ? match : match[1];
      }
    });

    // Extract transactions if present
    extracted.transactions = extractTransactions(text);

    // Extract holdings for equities/mutual funds
    if (documentType === 'equities' || documentType === 'mutualFunds') {
      extracted.holdings = extractHoldings(text, documentType);
    }

    return extracted;
  };

  const extractTransactions = (text) => {
    const transactions = [];
    const lines = text.split('\n');
    
    const transactionPatterns = [
      /(\d{1,2}[-/]\d{1,2}[-/]\d{4}).*?(CREDIT|DEBIT|BUY|SELL).*?(?:RS\.?|INR|₹)?\s*([\d,]+\.?\d{2})/i,
      /([A-Z0-9]+)\s+(CREDIT|DEBIT)\s+(\d{1,2}[-/]\d{1,2}[-/]\d{4})\s+([\d,]+\.?\d{2})/i
    ];

    lines.forEach(line => {
      transactionPatterns.forEach(pattern => {
        const match = line.match(pattern);
        if (match) {
          transactions.push({
            date: match[1] || match[3],
            type: match[2].toUpperCase(),
            amount: match[3] || match[4],
            narration: line.trim()
          });
        }
      });
    });

    return transactions;
  };

  const extractHoldings = (text, documentType) => {
    const holdings = [];
    const lines = text.split('\n');
    
    if (documentType === 'equities') {
      // Pattern for equity holdings
      const holdingPattern = /([A-Z0-9]+)\s+(\d+)\s+.*?(?:RS\.?|INR|₹)?\s*([\d,]+\.?\d{2})/i;
      
      lines.forEach(line => {
        const match = line.match(holdingPattern);
        if (match) {
          holdings.push({
            isin: match[1],
            units: match[2],
            currentValue: match[3],
            issuerName: line.trim()
          });
        }
      });
    } else if (documentType === 'mutualFunds') {
      // Pattern for mutual fund holdings
      const mfPattern = /([A-Z]+\d+[A-Z]*)\s+([\d.]+)\s+.*?(?:RS\.?|INR|₹)?\s*([\d,]+\.?\d{2})/i;
      
      lines.forEach(line => {
        const match = line.match(mfPattern);
        if (match) {
          holdings.push({
            schemeCode: match[1],
            units: match[2],
            currentValue: match[3],
            schemeName: line.trim()
          });
        }
      });
    }

    return holdings;
  };

  const mapToTemplate = (extractedData, template) => {
    const mapped = JSON.parse(JSON.stringify(template)); // Deep clone
    
    // Map profile data
    if (mapped.Profile && mapped.Profile.Holders && mapped.Profile.Holders.Holder) {
      const holder = mapped.Profile.Holders.Holder[0];
      holder.name = extractedData.name || '';
      holder.pan = extractedData.pan || '';
      holder.mobile = extractedData.mobile || '';
      holder.email = extractedData.email || '';
      holder.dob = extractedData.dob || '';
      holder.address = extractedData.address || '';
    }

    // Map summary data
    if (mapped.Summary) {
      if (mapped.fiType === 'DEPOSIT') {
        mapped.Summary.currentBalance = extractedData.balance || '';
        mapped.Summary.branch = extractedData.branch || '';
        mapped.Summary.ifscCode = extractedData.ifsc || '';
      } else if (mapped.Summary.Investment) {
        mapped.Summary.currentValue = extractedData.balance || '';
        if (extractedData.holdings && mapped.Summary.Investment.Holdings) {
          mapped.Summary.Investment.Holdings.Holding = extractedData.holdings;
        }
      }
    }

    // Map transactions
    if (mapped.Transactions && extractedData.transactions) {
      mapped.Transactions.Transaction = extractedData.transactions.map(txn => ({
        type: txn.type,
        mode: 'UNKNOWN',
        amount: txn.amount,
        transactionTimestamp: txn.date,
        narration: txn.narration || '',
        txnId: generateTransactionId()
      }));
    }

    // Set metadata
    mapped.maskedAccountNumber = extractedData.accountNumber || 'XXXXXXXXXXXX';
    mapped.bank = extractedData.bankName || 'Unknown Bank';

    return mapped;
  };

  const generateTransactionId = () => {
    return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9);
  };

  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError(null);
    setProcessing(true);

    try {
      let extractedText = '';
      
      // Check if it's an image or PDF
      if (uploadedFile.type.startsWith('image/')) {
        extractedText = await extractDataFromImage(uploadedFile);
      } else if (uploadedFile.type === 'application/pdf') {
        extractedText = await extractDataFromPDF(uploadedFile);
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or image file.');
      }

      const parsedData = parseFinancialData(extractedText);
      setJsonData(parsedData);
      setActiveTab('result');
    } catch (err) {
      setError(err.message);
      console.error('Error processing file:', err);
    } finally {
      setProcessing(false);
    }
  };

  const downloadJson = () => {
    if (!jsonData) return;
    
    const dataStr = JSON.stringify(jsonData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${file.name.split('.')[0]}_converted.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const copyToClipboard = () => {
    if (!jsonData) return;
    
    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2))
      .then(() => alert('JSON copied to clipboard!'))
      .catch(err => console.error('Failed to copy:', err));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center text-indigo-800">
              Financial Document to JSON Converter
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Upload PDF statements or screenshots from financial apps to convert them to JSON
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload</TabsTrigger>
                <TabsTrigger value="result">Result</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  <div className="space-y-4">
                    <div className="flex justify-center space-x-4">
                      <FileText className="w-12 h-12 text-gray-400" />
                      <Image className="w-12 h-12 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-700">
                        Drop your file here or click to browse
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Supports: Bank statements (PDF), Screenshots from Groww, Zerodha, HDFC, ICICI, SBI apps
                      </p>
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={processing}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {processing ? 'Processing...' : 'Select File'}
                    </Button>
                  </div>
                </div>

                {file && (
                  <Alert>
                    <AlertDescription>
                      Selected file: {file.name}
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </TabsContent>
              
              <TabsContent value="result" className="space-y-4">
                {jsonData ? (
                  <>
                    <div className="flex justify-end space-x-2">
                      <Button onClick={copyToClipboard} variant="outline">
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button onClick={downloadJson} className="bg-green-600 hover:bg-green-700 text-white">
                        <Download className="w-4 h-4 mr-2" />
                        Download JSON
                      </Button>
                    </div>
                    
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96">
                      <pre className="text-sm">
                        {JSON.stringify(jsonData, null, 2)}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No data to display. Please upload a file first.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JsonConverter;