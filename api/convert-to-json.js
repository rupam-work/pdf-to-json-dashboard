import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import pdf from 'pdf-parse';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

export const config = {
  api: {
    bodyParser: false,
    maxDuration: 60,
  },
};

// Comprehensive field mapping for all FI types
const FI_FIELD_MAPPINGS = {
  DEPOSIT: {
    profile: {
      holders: {
        type: 'type',
        holder: [{
          name: 'name',
          dob: 'dob',
          mobile: 'mobile',
          email: 'email',
          pan: 'pan',
          address: 'address',
          nominee: 'nominee',
          landline: 'landline',
          ckycCompliance: 'ckycCompliance'
        }]
      }
    },
    summary: {
      currentBalance: 'currentBalance',
      currency: 'currency',
      exchgeRate: 'exchgeRate',
      balanceDateTime: 'balanceDateTime',
      type: 'type',
      branch: 'branch',
      facility: 'facility',
      ifscCode: 'ifscCode',
      micrCode: 'micrCode',
      openingDate: 'openingDate',
      currentODLimit: 'currentODLimit',
      drawingLimit: 'drawingLimit',
      status: 'status',
      pending: []
    },
    transactions: {
      startDate: 'startDate',
      endDate: 'endDate',
      transaction: []
    }
  },
  EQUITIES: {
    profile: {
      holders: {
        holder: [{
          dob: 'dob',
          pan: 'pan',
          name: 'name',
          email: 'email',
          mobile: 'mobile',
          address: 'address',
          dematId: 'dematId',
          nominee: 'nominee'
        }]
      }
    },
    summary: {
      investment: {
        holdings: {
          holding: []
        }
      },
      currentValue: 'currentValue'
    },
    transactions: {
      startDate: 'startDate',
      endDate: 'endDate',
      transaction: []
    }
  },
  MUTUAL_FUNDS: {
    profile: {
      holders: {
        type: 'type',
        holder: [{
          dob: 'dob',
          pan: 'pan',
          name: 'name',
          email: 'email',
          mobile: 'mobile',
          address: 'address',
          dematId: 'dematId',
          folioNo: 'folioNo',
          nominee: 'nominee',
          landline: 'landline',
          kycCompliance: 'kycCompliance'
        }]
      }
    },
    summary: {
      costValue: 'costValue',
      investment: {
        holdings: {
          holding: []
        }
      },
      currentValue: 'currentValue'
    },
    transactions: {
      startDate: 'startDate',
      endDate: 'endDate',
      transaction: []
    }
  }
};

// Pattern matching for detecting FI type
const detectFIType = (text) => {
  const patterns = {
    DEPOSIT: /account\s*type|savings|current|ifsc|balance|deposit/i,
    EQUITIES: /demat|isin|equity|shares|stock|bse|nse/i,
    MUTUAL_FUNDS: /mutual\s*fund|nav|folio|amc|scheme/i,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return type;
    }
  }
  return 'DEPOSIT'; // Default
};

// Extract structured data from text
const extractStructuredData = (text, fiType) => {
  const fieldMapping = FI_FIELD_MAPPINGS[fiType];
  const result = {
    fiType,
    linkReferenceNumber: generateUUID(),
    maskedAccountNumber: extractAccountNumber(text),
    bank: extractBankName(text),
    Profile: {},
    Summary: {},
    Transactions: {
      startDate: '',
      endDate: '',
      Transaction: []
    }
  };

  // Extract profile data
  if (fieldMapping.profile) {
    result.Profile = extractProfileData(text, fieldMapping.profile);
  }

  // Extract summary data
  if (fieldMapping.summary) {
    result.Summary = extractSummaryData(text, fieldMapping.summary, fiType);
  }

  // Extract transactions
  result.Transactions = extractTransactions(text, fiType);

  return result;
};

// Extract profile data based on field mapping
const extractProfileData = (text, profileMapping) => {
  const profile = { Holders: { Holder: [{}] } };
  
  // Extract holder information
  const holderData = profile.Holders.Holder[0];
  
  // Name extraction
  const nameMatch = text.match(/name[:\s]+([A-Za-z\s]+)/i);
  if (nameMatch) holderData.name = nameMatch[1].trim();
  
  // DOB extraction
  const dobMatch = text.match(/(?:dob|date\s*of\s*birth)[:\s]+(\d{4}-\d{2}-\d{2}|\d{2}[-/]\d{2}[-/]\d{4})/i);
  if (dobMatch) holderData.dob = formatDate(dobMatch[1]);
  
  // Mobile extraction
  const mobileMatch = text.match(/(?:mobile|phone)[:\s]+(\+?\d{10,12})/i);
  if (mobileMatch) holderData.mobile = mobileMatch[1];
  
  // Email extraction
  const emailMatch = text.match(/email[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) holderData.email = emailMatch[1];
  
  // PAN extraction
  const panMatch = text.match(/pan[:\s]+([A-Z]{5}\d{4}[A-Z])/i);
  if (panMatch) holderData.pan = panMatch[1];
  
  // Address extraction
  const addressMatch = text.match(/address[:\s]+([^,\n]+(?:,\s*[^,\n]+)*)/i);
  if (addressMatch) holderData.address = addressMatch[1].trim();
  
  // Set type if available
  const typeMatch = text.match(/(?:type|holder\s*type)[:\s]+(single|joint)/i);
  if (typeMatch) profile.Holders.type = typeMatch[1].toUpperCase();
  
  return profile;
};

// Extract summary data
const extractSummaryData = (text, summaryMapping, fiType) => {
  const summary = {};
  
  if (fiType === 'DEPOSIT') {
    // Balance extraction
    const balanceMatch = text.match(/(?:current\s*balance|balance)[:\s]+(?:Rs\.?\s*)?(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    if (balanceMatch) summary.currentBalance = balanceMatch[1].replace(/,/g, '');
    
    // Account type
    const typeMatch = text.match(/(?:account\s*type|type)[:\s]+(savings|current)/i);
    if (typeMatch) summary.type = typeMatch[1].toUpperCase();
    
    // IFSC Code
    const ifscMatch = text.match(/ifsc[:\s]+([A-Z]{4}\d{7})/i);
    if (ifscMatch) summary.ifscCode = ifscMatch[1];
    
    // Branch
    const branchMatch = text.match(/branch[:\s]+([^\n]+)/i);
    if (branchMatch) summary.branch = branchMatch[1].trim();
    
    // Status
    const statusMatch = text.match(/status[:\s]+(active|inactive|dormant)/i);
    if (statusMatch) summary.status = statusMatch[1].toUpperCase();
  } else if (fiType === 'EQUITIES') {
    summary.Investment = { Holdings: { Holding: [] } };
    
    // Extract holdings
    const holdingMatches = text.matchAll(/isin[:\s]+([A-Z]{2}\w{10}).*?units[:\s]+(\d+).*?(?:price|nav)[:\s]+(\d+(?:\.\d+)?)/gi);
    for (const match of holdingMatches) {
      summary.Investment.Holdings.Holding.push({
        isin: match[1],
        units: match[2],
        lastTradedPrice: match[3]
      });
    }
    
    // Current value
    const valueMatch = text.match(/(?:current\s*value|portfolio\s*value)[:\s]+(?:Rs\.?\s*)?(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    if (valueMatch) summary.currentValue = valueMatch[1].replace(/,/g, '');
  } else if (fiType === 'MUTUAL_FUNDS') {
    summary.Investment = { Holdings: { Holding: [] } };
    
    // Extract MF holdings
    const mfMatches = text.matchAll(/(?:scheme|fund)[:\s]+([^\n]+).*?nav[:\s]+(\d+(?:\.\d+)?).*?units[:\s]+(\d+(?:\.\d+)?)/gi);
    for (const match of mfMatches) {
      summary.Investment.Holdings.Holding.push({
        schemeCode: match[1].trim(),
        nav: match[2],
        closingUnits: match[3]
      });
    }
    
    // Cost and current value
    const costMatch = text.match(/(?:cost\s*value|invested)[:\s]+(?:Rs\.?\s*)?(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    if (costMatch) summary.costValue = costMatch[1].replace(/,/g, '');
    
    const currentMatch = text.match(/(?:current\s*value|market\s*value)[:\s]+(?:Rs\.?\s*)?(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    if (currentMatch) summary.currentValue = currentMatch[1].replace(/,/g, '');
  }
  
  return summary;
};

// Extract transactions
const extractTransactions = (text, fiType) => {
  const transactions = {
    startDate: '',
    endDate: '',
    Transaction: []
  };
  
  // Extract date range
  const dateRangeMatch = text.match(/(?:from|start\s*date)[:\s]+(\d{4}-\d{2}-\d{2}).*?(?:to|end\s*date)[:\s]+(\d{4}-\d{2}-\d{2})/i);
  if (dateRangeMatch) {
    transactions.startDate = dateRangeMatch[1];
    transactions.endDate = dateRangeMatch[2];
  }
  
  // Extract individual transactions
  const txnPattern = fiType === 'DEPOSIT' 
    ? /(\d{4}-\d{2}-\d{2}).*?(credit|debit).*?(?:Rs\.?\s*)?(\d+(?:,\d{3})*(?:\.\d{2})?).*?([^\n]+)/gi
    : /(\d{4}-\d{2}-\d{2}).*?(buy|sell|credit|debit).*?(?:Rs\.?\s*)?(\d+(?:,\d{3})*(?:\.\d{2})?).*?([^\n]+)/gi;
  
  const txnMatches = text.matchAll(txnPattern);
  for (const match of txnMatches) {
    transactions.Transaction.push({
      transactionDate: match[1],
      type: match[2].toUpperCase(),
      amount: match[3].replace(/,/g, ''),
      narration: match[4].trim()
    });
  }
  
  return transactions;
};

// Helper functions
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const extractAccountNumber = (text) => {
  const patterns = [
    /account\s*(?:no|number)?[:\s]+(\w+)/i,
    /a\/c\s*(?:no)?[:\s]+(\w+)/i,
    /folio\s*(?:no)?[:\s]+(\w+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const accNum = match[1];
      return 'X'.repeat(Math.max(0, accNum.length - 4)) + accNum.slice(-4);
    }
  }
  return 'XXXXXXXXXXXX';
};

const extractBankName = (text) => {
  const bankPatterns = [
    /(?:bank|institution)[:\s]+([^,\n]+)/i,
    /(hdfc|icici|sbi|axis|kotak|yes\s*bank|pnb|bob|canara)/i
  ];
  
  for (const pattern of bankPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return 'Unknown Bank';
};

const formatDate = (dateStr) => {
  // Convert various date formats to YYYY-MM-DD
  const date = new Date(dateStr);
  if (!isNaN(date)) {
    return date.toISOString().split('T')[0];
  }
  return dateStr;
};

// Process image with OCR
const processImage = async (imagePath) => {
  try {
    // Preprocess image for better OCR
    const processedPath = imagePath.replace(/\.[^.]+$/, '_processed.png');
    await sharp(imagePath)
      .resize({ width: 2000, height: 2000, fit: 'inside' })
      .grayscale()
      .normalize()
      .sharpen()
      .toFile(processedPath);
    
    // Perform OCR
    const { data: { text } } = await Tesseract.recognize(processedPath, 'eng', {
      logger: m => console.log(m)
    });
    
    // Clean up processed image
    await fs.unlink(processedPath).catch(() => {});
    
    return text;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to process image');
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const uploadDir = path.join(process.cwd(), 'tmp');
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directory:', error);
  }

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
  });

  try {
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let extractedText = '';
    const fileExtension = path.extname(file.originalFilename || '').toLowerCase();

    // Process based on file type
    if (fileExtension === '.pdf') {
      // Extract text from PDF
      const dataBuffer = await fs.readFile(file.filepath);
      const data = await pdf(dataBuffer);
      extractedText = data.text;
    } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(fileExtension)) {
      // Process image with OCR
      extractedText = await processImage(file.filepath);
    } else {
      await fs.unlink(file.filepath).catch(() => {});
      return res.status(400).json({ error: 'Unsupported file type. Please upload PDF or image files.' });
    }

    // Clean up uploaded file
    await fs.unlink(file.filepath).catch(() => {});

    // Detect FI type
    const fiType = detectFIType(extractedText);

    // Extract structured data
    const jsonData = extractStructuredData(extractedText, fiType);

    // Return the JSON data
    res.status(200).json({
      status: 'success',
      ver: '1.19.0',
      data: [jsonData]
    });

  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ 
      error: 'Failed to process file', 
      details: error.message 
    });
  }
}
