import formidable from 'formidable';
import fs from 'fs';
import pdfParse from 'pdf-parse';

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// FI Type Detection Patterns
const FI_PATTERNS = {
  deposit: {
    keywords: ['savings account', 'current account', 'bank statement', 'account summary', 'deposit account', 'ifsc', 'branch', 'cheque'],
    banks: ['sbi', 'hdfc', 'icici', 'axis', 'kotak', 'pnb', 'bank of baroda', 'canara', 'union bank', 'bank'],
    priority: 1
  },
  mutualFund: {
    keywords: ['mutual fund', 'folio', 'nav', 'units', 'scheme', 'amc', 'fund house', 'systematic', 'redemption', 'switch'],
    amcs: ['hdfc mutual', 'icici prudential', 'sbi mutual', 'axis mutual', 'kotak mutual', 'aditya birla', 'nippon', 'franklin'],
    priority: 2
  },
  equity: {
    keywords: ['demat', 'shares', 'equity', 'stock', 'securities', 'depository', 'cdsl', 'nsdl', 'isin', 'trading'],
    brokers: ['zerodha', 'upstox', 'groww', 'angel', 'icici direct', 'hdfc securities', 'kotak securities'],
    priority: 3
  },
  etf: {
    keywords: ['etf', 'exchange traded fund', 'index fund', 'nifty', 'sensex', 'gold etf', 'liquid etf'],
    priority: 4
  }
};

// Schema Templates
const SCHEMA_TEMPLATES = {
  deposit: {
    status: 'success',
    ver: '1.19.0',
    data: [{
      linkReferenceNumber: '',
      maskedAccountNumber: '',
      fiType: 'deposit',
      bank: '',
      Summary: {
        currentBalance: '',
        currency: 'INR',
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
        status: 'active',
        Pending: []
      },
      Profile: {
        Holders: {
          type: 'single',
          Holder: []
        }
      },
      Transactions: {
        startDate: '',
        endDate: '',
        Transaction: []
      }
    }]
  },
  mutualFund: {
    status: 'success',
    ver: '1.19.0',
    data: [{
      linkReferenceNumber: '',
      maskedFolioNumber: '',
      fiType: 'mutualFund',
      amc: '',
      Summary: {
        currentValue: '',
        investmentValue: '',
        currency: 'INR',
        totalUnits: '',
        nav: '',
        navDate: '',
        status: 'active'
      },
      Profile: {
        Holders: {
          type: 'single',
          Holder: []
        }
      },
      Transactions: {
        startDate: '',
        endDate: '',
        Transaction: []
      },
      Holdings: []
    }]
  },
  equity: {
    status: 'success',
    ver: '1.19.0',
    data: [{
      linkReferenceNumber: '',
      maskedDematId: '',
      fiType: 'equity',
      depository: '',
      Summary: {
        currentValue: '',
        investmentValue: '',
        currency: 'INR',
        pledgedQuantity: '',
        freeQuantity: '',
        dpId: '',
        clientId: '',
        status: 'active'
      },
      Profile: {
        Holders: {
          type: 'single',
          Holder: []
        }
      },
      Holdings: []
    }]
  },
  etf: {
    status: 'success',
    ver: '1.19.0',
    data: [{
      linkReferenceNumber: '',
      maskedDematId: '',
      fiType: 'etf',
      depository: '',
      Summary: {
        currentValue: '',
        investmentValue: '',
        currency: 'INR',
        totalUnits: '',
        nav: '',
        navDate: '',
        status: 'active'
      },
      Profile: {
        Holders: {
          type: 'single',
          Holder: []
        }
      },
      Holdings: []
    }]
  }
};

// Extraction patterns
const EXTRACTION_PATTERNS = {
  amount: /(?:₹|Rs\.?|INR)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
  date: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i,
  percentage: /(\d+(?:\.\d+)?)\s*%/i,
  accountNumber: /Account\s*(?:Number|No\.?)?\s*[:\-]?\s*(\d{4,})/i,
  ifsc: /IFSC\s*(?:Code)?\s*[:\-]?\s*([A-Z]{4}0[A-Z0-9]{6})/i,
  branch: /Branch\s*[:\-]?\s*([A-Za-z\s]+?)(?=\n|$)/i,
  folioNumber: /Folio\s*(?:Number|No\.?)?\s*[:\-]?\s*([A-Z0-9\/\-]+)/i,
  nav: /NAV\s*[:\-]?\s*(?:₹|Rs\.?)?\s*(\d+(?:\.\d+)?)/i,
  units: /Units?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
  scheme: /Scheme\s*(?:Name)?\s*[:\-]?\s*([A-Za-z\s\-\(\)]+?)(?=\n|$)/i,
  isin: /ISIN\s*[:\-]?\s*([A-Z]{2}[A-Z0-9]{10})/i,
  dpId: /DP\s*ID\s*[:\-]?\s*(\d+)/i,
  clientId: /Client\s*ID\s*[:\-]?\s*(\d+)/i,
  quantity: /Quantity\s*[:\-]?\s*(\d+)/i
};

// Detect FI Type
function detectFIType(text) {
  const lowerText = text.toLowerCase();
  const scores = {};
  
  for (const [type, config] of Object.entries(FI_PATTERNS)) {
    scores[type] = 0;
    
    config.keywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        scores[type] += 10;
      }
    });
    
    if (config.banks) {
      config.banks.forEach(bank => {
        if (lowerText.includes(bank)) {
          scores[type] += 20;
        }
      });
    }
    if (config.amcs) {
      config.amcs.forEach(amc => {
        if (lowerText.includes(amc)) {
          scores[type] += 20;
        }
      });
    }
    if (config.brokers) {
      config.brokers.forEach(broker => {
        if (lowerText.includes(broker)) {
          scores[type] += 20;
        }
      });
    }
  }
  
  const detectedType = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0];
  
  return detectedType[1] > 0 ? detectedType[0] : 'deposit';
}

// Extract holder information
function extractHolderInfo(text) {
  const holder = {
    name: '',
    dob: '',
    mobile: '',
    email: '',
    pan: '',
    address: ''
  };
  
  const nameMatch = text.match(/(?:Name|Customer|Holder)\s*[:\-]?\s*([A-Za-z\s]+?)(?=\n|Account|Mobile|Email|PAN)/i);
  if (nameMatch) holder.name = nameMatch[1].trim();
  
  const panMatch = text.match(/PAN\s*[:\-]?\s*([A-Z]{5}\d{4}[A-Z])/i);
  if (panMatch) holder.pan = panMatch[1];
  
  const emailMatch = text.match(/Email\s*[:\-]?\s*([^\s]+@[^\s]+\.[^\s]+)/i);
  if (emailMatch) holder.email = emailMatch[1];
  
  const mobileMatch = text.match(/(?:Mobile|Phone)\s*[:\-]?\s*(\+?\d{10,})/i);
  if (mobileMatch) holder.mobile = mobileMatch[1];
  
  return holder;
}

// Extract deposit data
function extractDepositData(text) {
  const template = JSON.parse(JSON.stringify(SCHEMA_TEMPLATES.deposit));
  const data = template.data[0];
  
  const accMatch = text.match(EXTRACTION_PATTERNS.accountNumber);
  if (accMatch) data.maskedAccountNumber = 'XXXX' + accMatch[1].slice(-4);
  
  const ifscMatch = text.match(EXTRACTION_PATTERNS.ifsc);
  if (ifscMatch) data.Summary.ifscCode = ifscMatch[1];
  
  const branchMatch = text.match(EXTRACTION_PATTERNS.branch);
  if (branchMatch) data.Summary.branch = branchMatch[1].trim();
  
  const bankMatch = text.match(/(?:Bank|Banking)\s*[:\-]?\s*([A-Za-z\s]+?)(?=\n|Branch|IFSC)/i);
  if (bankMatch) data.bank = bankMatch[1].trim();
  
  const balanceMatch = text.match(/(?:Current|Available|Total)\s*Balance\s*[:\-]?\s*(?:₹|Rs\.?)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
  if (balanceMatch) data.Summary.currentBalance = balanceMatch[1].replace(/,/g, '');
  
  if (text.toLowerCase().includes('savings')) data.Summary.type = 'savings';
  else if (text.toLowerCase().includes('current')) data.Summary.type = 'current';
  
  const holder = extractHolderInfo(text);
  data.Profile.Holders.Holder = [holder];
  
  const lines = text.split(/\n+/);
  const txnRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+([^\d]+?)\s+(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:Dr|Cr)?\s+(\d+(?:,\d{3})*(?:\.\d{2})?)/;
  
  lines.forEach(line => {
    const match = line.match(txnRegex);
    if (match) {
      const transaction = {
        type: line.includes('Dr') ? 'debit' : 'credit',
        mode: 'UPI',
        amount: match[3].replace(/,/g, ''),
        currentBalance: match[4].replace(/,/g, ''),
        transactionTimestamp: match[1],
        valueDate: match[1],
        txnId: 'TXN' + Math.random().toString(36).substr(2, 9),
        narration: match[2].trim(),
        reference: ''
      };
      data.Transactions.Transaction.push(transaction);
    }
  });
  
  if (data.Transactions.Transaction.length > 0) {
    data.Transactions.startDate = data.Transactions.Transaction[0].transactionTimestamp;
    data.Transactions.endDate = data.Transactions.Transaction[data.Transactions.Transaction.length - 1].transactionTimestamp;
  }
  
  return template;
}

// Extract mutual fund data
function extractMutualFundData(text) {
  const template = JSON.parse(JSON.stringify(SCHEMA_TEMPLATES.mutualFund));
  const data = template.data[0];
  
  const folioMatch = text.match(EXTRACTION_PATTERNS.folioNumber);
  if (folioMatch) data.maskedFolioNumber = 'XXXX' + folioMatch[1].slice(-4);
  
  const amcMatch = text.match(/(?:AMC|Fund House|Mutual Fund)\s*[:\-]?\s*([A-Za-z\s]+?)(?=\n|Folio)/i);
  if (amcMatch) data.amc = amcMatch[1].trim();
  
  const valueMatch = text.match(/(?:Current|Market)\s*Value\s*[:\-]?\s*(?:₹|Rs\.?)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
  if (valueMatch) data.Summary.currentValue = valueMatch[1].replace(/,/g, '');
  
  const navMatch = text.match(EXTRACTION_PATTERNS.nav);
  if (navMatch) data.Summary.nav = navMatch[1];
  
  const unitsMatch = text.match(EXTRACTION_PATTERNS.units);
  if (unitsMatch) data.Summary.totalUnits = unitsMatch[1];
  
  const holder = extractHolderInfo(text);
  data.Profile.Holders.Holder = [holder];
  
  return template;
}

// Extract equity data
function extractEquityData(text) {
  const template = JSON.parse(JSON.stringify(SCHEMA_TEMPLATES.equity));
  const data = template.data[0];
  
  const dpIdMatch = text.match(EXTRACTION_PATTERNS.dpId);
  if (dpIdMatch) data.Summary.dpId = dpIdMatch[1];
  
  const clientIdMatch = text.match(EXTRACTION_PATTERNS.clientId);
  if (clientIdMatch) data.Summary.clientId = clientIdMatch[1];
  
  if (dpIdMatch && clientIdMatch) {
    data.maskedDematId = dpIdMatch[1] + 'XXXX' + clientIdMatch[1].slice(-4);
  }
  
  if (text.toLowerCase().includes('cdsl')) data.depository = 'CDSL';
  else if (text.toLowerCase().includes('nsdl')) data.depository = 'NSDL';
  
  const valueMatch = text.match(/(?:Total|Portfolio)\s*Value\s*[:\-]?\s*(?:₹|Rs\.?)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
  if (valueMatch) data.Summary.currentValue = valueMatch[1].replace(/,/g, '');
  
  const holder = extractHolderInfo(text);
  data.Profile.Holders.Holder = [holder];
  
  return template;
}

// Extract ETF data
function extractETFData(text) {
  const template = JSON.parse(JSON.stringify(SCHEMA_TEMPLATES.etf));
  const data = template.data[0];
  
  const dpIdMatch = text.match(EXTRACTION_PATTERNS.dpId);
  if (dpIdMatch) data.Summary.dpId = dpIdMatch[1];
  
  const clientIdMatch = text.match(EXTRACTION_PATTERNS.clientId);
  if (clientIdMatch) data.Summary.clientId = clientIdMatch[1];
  
  if (dpIdMatch && clientIdMatch) {
    data.maskedDematId = dpIdMatch[1] + 'XXXX' + clientIdMatch[1].slice(-4);
  }
  
  const navMatch = text.match(EXTRACTION_PATTERNS.nav);
  if (navMatch) data.Summary.nav = navMatch[1];
  
  const unitsMatch = text.match(/Total\s*Units?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
  if (unitsMatch) data.Summary.totalUnits = unitsMatch[1];
  
  const valueMatch = text.match(/(?:Total|Market)\s*Value\s*[:\-]?\s*(?:₹|Rs\.?)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
  if (valueMatch) data.Summary.currentValue = valueMatch[1].replace(/,/g, '');
  
  const holder = extractHolderInfo(text);
  data.Profile.Holders.Holder = [holder];
  
  return template;
}

// Main extraction function
function extractFinancialData(text, fiType = null) {
  const detectedType = fiType || detectFIType(text);
  
  let result;
  switch (detectedType) {
    case 'deposit':
      result = extractDepositData(text);
      break;
    case 'mutualFund':
      result = extractMutualFundData(text);
      break;
    case 'equity':
      result = extractEquityData(text);
      break;
    case 'etf':
      result = extractETFData(text);
      break;
    default:
      result = extractDepositData(text);
  }
  
  result.metadata = {
    extractedAt: new Date().toISOString(),
    detectedFIType: detectedType,
    confidence: 'medium'
  };
  
  return result;
}

// Parse form data
const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
};

// API handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files } = await parseForm(req);
    const uploadedFiles = Array.isArray(files.files) ? files.files : [files.files];
    
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    
    for (const file of uploadedFiles) {
      try {
        let text = '';
        
        // Read file based on type
        if (file.mimetype === 'application/pdf' || file.originalFilename.toLowerCase().endsWith('.pdf')) {
          const dataBuffer = fs.readFileSync(file.filepath);
          const data = await pdfParse(dataBuffer);
          text = data.text;
        } else {
          // For images, we'll return a message since OCR requires additional setup
          text = 'Image OCR is not available in this serverless version. Please use PDF files.';
        }
        
        // Extract financial data
        const data = extractFinancialData(text);
        
        results.push({ 
          name: file.originalFilename, 
          data,
          extractedText: text.substring(0, 500) + '...'
        });
      } catch (e) {
        results.push({ 
          name: file.originalFilename, 
          error: e.message 
        });
      } finally {
        // Clean up uploaded file
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
      }
    }

    res.status(200).json({ files: results });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ error: 'Failed to process files' });
  }
}
