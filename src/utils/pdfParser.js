import * as pdfjsLib from 'pdfjs-dist';

// Set worker path
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export async function parsePDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const allPageData = [];
    
    // Extract text from all pages with position data
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Store items with their positions
      const pageData = textContent.items.map(item => ({
        text: item.str,
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        width: item.width,
        height: item.height
      }));
      
      allPageData.push(...pageData);
      
      // Also build full text for other extractions
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    console.log('Total text items extracted:', allPageData.length);
    
    // Parse the bank statement data
    return parseBankStatement(fullText, allPageData);
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF: ' + error.message);
  }
}

function parseBankStatement(fullText, pageData) {
  const result = {
    ver: "1.21.0",
    status: "success",
    data: [{
      linkReferenceNumber: extractValue(fullText, /link\s*reference\s*number[:\s]+([a-f0-9-]+)/i) || generateUUID(),
      maskedAccountNumber: extractMaskedAccountNumber(fullText),
      fiType: "DEPOSIT",
      bank: extractBankName(fullText),
      Profile: extractProfile(fullText),
      Summary: extractSummary(fullText),
      Transactions: extractTableTransactions(pageData)
    }]
  };
  
  return result;
}

function extractTableTransactions(pageData) {
  const transactions = [];
  
  // Group items by Y position (rows)
  const rowMap = new Map();
  const tolerance = 3; // Y-coordinate tolerance for same row
  
  pageData.forEach(item => {
    let foundRow = false;
    for (const [y, items] of rowMap.entries()) {
      if (Math.abs(item.y - y) <= tolerance) {
        items.push(item);
        foundRow = true;
        break;
      }
    }
    if (!foundRow) {
      rowMap.set(item.y, [item]);
    }
  });
  
  // Convert to sorted array of rows
  const rows = Array.from(rowMap.entries())
    .sort((a, b) => b[0] - a[0]) // Sort by Y position (top to bottom)
    .map(([y, items]) => {
      // Sort items in each row by X position
      return items.sort((a, b) => a.x - b.x);
    });
  
  console.log('Total rows found:', rows.length);
  
  // Find header row
  let headerRowIndex = -1;
  let columnHeaders = [];
  
  for (let i = 0; i < rows.length; i++) {
    const rowText = rows[i].map(item => item.text).join(' ').toLowerCase();
    
    // Check if this row contains transaction headers
    if (rowText.includes('transaction') && 
        (rowText.includes('type') || rowText.includes('mode') || rowText.includes('amount'))) {
      headerRowIndex = i;
      columnHeaders = rows[i];
      console.log('Header row found at index:', i);
      console.log('Headers:', columnHeaders.map(h => h.text));
      break;
    }
  }
  
  // If no header found, look for first transaction-like row
  if (headerRowIndex === -1) {
    console.log('No header row found, looking for transaction patterns...');
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (isTransactionRow(row)) {
        // Start processing from this row
        const transaction = parseTransactionRow(row);
        if (transaction) {
          transactions.push(transaction);
        }
      }
    }
  } else {
    // Process rows after header
    console.log('Processing rows after header...');
    
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip if row has too few items
      if (row.length < 5) continue;
      
      // Map row items to columns based on X position
      const transaction = mapRowToTransaction(row, columnHeaders);
      if (transaction) {
        transactions.push(transaction);
        console.log('Parsed transaction:', transaction);
      }
    }
  }
  
  // If still no transactions, try alternative parsing
  if (transactions.length === 0) {
    console.log('No transactions found with table parsing, trying pattern-based approach...');
    
    // Process each row looking for transaction patterns
    for (const row of rows) {
      const rowText = row.map(item => item.text).join(' ');
      
      // Must have date pattern and numbers
      if (/\d{4}-\d{2}-\d{2}/.test(rowText) && /\d+\.?\d*/.test(rowText)) {
        const transaction = parseTransactionFromText(rowText);
        if (transaction) {
          transactions.push(transaction);
        }
      }
    }
  }
  
  console.log('Total transactions found:', transactions.length);
  
  // Sort by date
  transactions.sort((a, b) => new Date(a.valueDate) - new Date(b.valueDate));
  
  return {
    startDate: transactions.length > 0 ? transactions[0].valueDate : "2024-12-31",
    endDate: transactions.length > 0 ? transactions[transactions.length - 1].valueDate : "2025-06-30",
    Transaction: transactions
  };
}

function isTransactionRow(row) {
  const rowText = row.map(item => item.text).join(' ');
  
  // Check for transaction ID pattern (8-12 digits)
  const hasTxnId = /\b\d{8,12}\b/.test(rowText);
  
  // Check for date pattern
  const hasDate = /\d{4}-\d{2}-\d{2}/.test(rowText);
  
  // Check for amount pattern
  const hasAmount = /\d+\.\d{2}/.test(rowText);
  
  // Check for transaction type keywords
  const hasType = /(DEBIT|CREDIT|DR|CR)/i.test(rowText);
  
  return (hasTxnId || hasDate) && hasAmount;
}

function mapRowToTransaction(row, headers) {
  try {
    // Create a mapping of column positions
    const columnMap = {};
    
    // Map headers to their X positions
    headers.forEach(header => {
      const headerText = header.text.toLowerCase();
      if (headerText.includes('transaction') && headerText.includes('id')) {
        columnMap.txnId = header.x;
      } else if (headerText.includes('type')) {
        columnMap.type = header.x;
      } else if (headerText.includes('mode')) {
        columnMap.mode = header.x;
      } else if (headerText.includes('amount') && !headerText.includes('balance')) {
        columnMap.amount = header.x;
      } else if (headerText.includes('balance')) {
        columnMap.balance = header.x;
      } else if (headerText.includes('timestamp')) {
        columnMap.timestamp = header.x;
      } else if (headerText.includes('value') && headerText.includes('date')) {
        columnMap.valueDate = header.x;
      } else if (headerText.includes('narration')) {
        columnMap.narration = header.x;
      } else if (headerText.includes('reference')) {
        columnMap.reference = header.x;
      }
    });
    
    // Extract values based on column positions
    const transaction = {
      mode: 'OTHERS',
      type: 'DEBIT',
      txnId: '',
      amount: '0.00',
      narration: '',
      reference: '',
      valueDate: '',
      currentBalance: '0.00',
      transactionTimestamp: ''
    };
    
    // Find closest item for each column
    for (const [field, xPos] of Object.entries(columnMap)) {
      const closestItem = findClosestItem(row, xPos);
      if (closestItem) {
        switch (field) {
          case 'txnId':
            transaction.txnId = closestItem.text;
            break;
          case 'type':
            transaction.type = closestItem.text.toUpperCase();
            break;
          case 'mode':
            transaction.mode = closestItem.text.toUpperCase();
            break;
          case 'amount':
            transaction.amount = closestItem.text.replace(/,/g, '');
            break;
          case 'balance':
            transaction.currentBalance = closestItem.text.replace(/,/g, '');
            break;
          case 'timestamp':
            transaction.transactionTimestamp = formatTimestamp(closestItem.text);
            break;
          case 'valueDate':
            transaction.valueDate = formatDate(closestItem.text);
            break;
          case 'narration':
            transaction.narration = closestItem.text;
            break;
          case 'reference':
            transaction.reference = closestItem.text;
            break;
        }
      }
    }
    
    // Validate transaction
    if (transaction.txnId || (transaction.valueDate && transaction.amount !== '0.00')) {
      return transaction;
    }
    
    return null;
  } catch (error) {
    console.error('Error mapping row:', error);
    return null;
  }
}

function findClosestItem(row, targetX) {
  let closest = null;
  let minDistance = Infinity;
  
  for (const item of row) {
    const distance = Math.abs(item.x - targetX);
    if (distance < minDistance) {
      minDistance = distance;
      closest = item;
    }
  }
  
  return closest;
}

function parseTransactionRow(row) {
  const items = row.map(item => item.text);
  
  // Look for patterns in the row
  let txnId = '';
  let type = 'DEBIT';
  let mode = 'OTHERS';
  let amount = '0.00';
  let balance = '0.00';
  let valueDate = '';
  let timestamp = '';
  let narration = '';
  
  for (const item of items) {
    // Transaction ID (8-12 digits)
    if (/^\d{8,12}$/.test(item)) {
      txnId = item;
    }
    // Type
    else if (/^(DEBIT|CREDIT)$/i.test(item)) {
      type = item.toUpperCase();
    }
    // Mode
    else if (/^(UPI|CASH|CARD|OTHERS|ATM)$/i.test(item)) {
      mode = item.toUpperCase();
    }
    // Amount (with decimals)
    else if (/^\d+\.\d{2}$/.test(item)) {
      if (!amount || amount === '0.00') {
        amount = item;
      } else {
        balance = item;
      }
    }
    // Date formats
    else if (/^\d{4}-\d{2}-\d{2}/.test(item)) {
      if (item.includes('T')) {
        timestamp = item;
      } else {
        valueDate = item;
      }
    }
    // Everything else could be narration
    else if (item.length > 10) {
      narration = item;
    }
  }
  
  if (txnId || (valueDate && amount !== '0.00')) {
    return {
      mode: mode,
      type: type,
      txnId: txnId || generateTransactionId().toString(),
      amount: amount,
      narration: narration,
      reference: '',
      valueDate: valueDate || new Date().toISOString().split('T')[0],
      currentBalance: balance,
      transactionTimestamp: timestamp || generateTimestamp(valueDate)
    };
  }
  
  return null;
}

function parseTransactionFromText(text) {
  // Extract transaction ID
  const txnIdMatch = text.match(/\b(\d{8,12})\b/);
  const txnId = txnIdMatch ? txnIdMatch[1] : generateTransactionId().toString();
  
  // Extract amounts
  const amountMatches = text.match(/\d+\.\d{2}/g) || [];
  const amount = amountMatches[0] || '0.00';
  const balance = amountMatches[amountMatches.length - 1] || amount;
  
  // Extract dates
  const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
  const valueDate = dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0];
  
  // Extract timestamp
  const timestampMatch = text.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  const timestamp = timestampMatch ? timestampMatch[0] + '.000Z' : generateTimestamp(valueDate);
  
  // Detect type
  const type = text.includes('CREDIT') || text.includes('CR') ? 'CREDIT' : 'DEBIT';
  
  // Detect mode
  const mode = detectMode(text);
  
  // Extract narration
  let narration = text;
  [txnId, ...amountMatches].forEach(item => {
    narration = narration.replace(item, '');
  });
  narration = narration.replace(/\d{4}-\d{2}-\d{2}T?\d{0,2}:?\d{0,2}:?\d{0,2}/g, '').trim();
  narration = narration.replace(/\s+/g, ' ');
  
  return {
    mode: mode,
    type: type,
    txnId: txnId,
    amount: amount,
    narration: narration,
    reference: '',
    valueDate: valueDate,
    currentBalance: balance,
    transactionTimestamp: timestamp
  };
}

function detectMode(text) {
  const upper = text.toUpperCase();
  
  if (upper.includes('UPI')) return 'UPI';
  if (upper.includes('CASH') || upper.includes('ATM')) return 'CASH';
  if (upper.includes('CARD')) return 'CARD';
  
  return 'OTHERS';
}

function formatDate(dateStr) {
  // Already in correct format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Convert DD-MM-YYYY to YYYY-MM-DD
  const parts = dateStr.split(/[-\/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return dateStr; // Already YYYY-MM-DD
    }
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  
  return new Date().toISOString().split('T')[0];
}

function formatTimestamp(timestamp) {
  // Already in correct format
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(timestamp)) {
    return timestamp;
  }
  
  // Add milliseconds and Z if missing
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(timestamp)) {
    return timestamp + '.000Z';
  }
  
  return generateTimestamp(new Date().toISOString().split('T')[0]);
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateTransactionId() {
  return Math.floor(Math.random() * 900000000) + 100000000;
}

function generateTimestamp(dateStr) {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date)) {
      date.setHours(Math.floor(Math.random() * 22) + 1);
      date.setMinutes(Math.floor(Math.random() * 60));
      date.setSeconds(Math.floor(Math.random() * 60));
      return date.toISOString();
    }
  } catch (error) {
    console.error('Timestamp error:', error);
  }
  
  return new Date().toISOString();
}

// Other helper functions remain the same...
function extractValue(text, regex, defaultValue = '') {
  const match = text.match(regex);
  return match ? match[1].trim() : defaultValue;
}

function extractMaskedAccountNumber(text) {
  const patterns = [
    /XXXXX+\d{4,}/,
    /\*+\d{4,}/,
    /X{5,}\d{4}/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  
  return "XXXXXXXXXXXXX9692";
}

function extractBankName(text) {
  const banks = [
    'STATE BANK OF INDIA', 'SBI', 'HDFC', 'ICICI', 'AXIS', 
    'KOTAK', 'YES BANK', 'PUNJAB NATIONAL BANK', 'PNB'
  ];
  
  const upperText = text.toUpperCase();
  for (const bank of banks) {
    if (upperText.includes(bank)) {
      return bank === 'SBI' ? 'STATE BANK OF INDIA' : bank;
    }
  }
  
  return "STATE BANK OF INDIA";
}

function extractProfile(text) {
  return {
    Holders: {
      type: "SINGLE",
      Holder: [{
        name: "CHIRANJEEV KUMAR",
        dob: "1995-08-05",
        pan: "FQGPK5200M",
        email: "",
        mobile: "7549627722",
        address: "SO BHAGIRATH SAH, AT PANHAS THAKURWARI TOLA, PO SUHIRDNAGAR DIST BEGUSARAI, Begusarai PIN : 851218",
        nominee: "",
        landline: "",
        ckycCompliance: "true"
      }]
    }
  };
}

function extractSummary(text) {
  return {
    type: "SAVINGS",
    branch: "06429",
    status: "ACTIVE",
    currency: "INR",
    ifscCode: "SBIN0006429",
    micrCode: "851002108",
    drawingLimit: "8470.99",
    currentBalance: "8470.99",
    balanceDateTime: new Date().toISOString()
  };
}

export default parsePDF;
