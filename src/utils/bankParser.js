// Bank-specific parsing configurations
export const bankConfigs = {
  'STATE BANK OF INDIA': {
    dateFormats: ['DD-MM-YYYY', 'DD/MM/YYYY', 'DD-MM-YY', 'DD/MM/YY'],
    transactionPatterns: [
      // SBI specific patterns
      /(\d{2}-\d{2}-\d{2,4})\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([A-Z]+)\s+(.+?)(?:\s+([\d,]+\.?\d*))?$/,
      /(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.?\d*)\s+(Dr|Cr)\s+([\d,]+\.?\d*)/,
      // Transaction with reference number
      /(\d{2}-\d{2}-\d{2,4})\s+(\d+)\s+([\d,]+\.?\d*)\s+(.+)/
    ],
    narrationKeywords: {
      'UPI': ['UPI', 'PhonePe', 'paytm', 'gpay', 'BHIM', '@'],
      'ATM': ['ATM', 'CASH', 'WDL'],
      'CARD': ['CARD', 'POS'],
      'NEFT': ['NEFT', 'RTGS', 'IMPS', 'INB', 'DIRECT'],
      'INTEREST': ['INTEREST'],
      'CHARGES': ['CHARGES', 'FEE', 'GST']
    }
  },
  'HDFC': {
    dateFormats: ['DD/MM/YYYY', 'DD-MM-YYYY'],
    transactionPatterns: [
      /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+(Cr|Dr)/
    ]
  },
  'ICICI': {
    dateFormats: ['DD-MM-YYYY', 'DD/MM/YYYY'],
    transactionPatterns: [
      /(\d{2}-\d{2}-\d{4})\s+(.+?)\s+([\d,]+\.?\d*)\s*(Cr|Dr)?\s+([\d,]+\.?\d*)/
    ]
  }
};

// Enhanced transaction extraction for bank statements
export function extractBankTransactions(text, bankName = 'STATE BANK OF INDIA') {
  const config = bankConfigs[bankName] || bankConfigs['STATE BANK OF INDIA'];
  const transactions = [];
  
  // Split text into lines
  const lines = text.split(/\r?\n/);
  
  // Find transaction section
  let inTransactionSection = false;
  let currentBalance = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if we're entering transaction section
    if (!inTransactionSection && 
        (line.includes('Transaction Details') || 
         line.includes('TRANSACTION DETAILS') ||
         line.includes('Date') && line.includes('Description') ||
         line.includes('Txn Date'))) {
      inTransactionSection = true;
      continue;
    }
    
    if (!inTransactionSection) continue;
    
    // Skip empty lines and headers
    if (!line || line.length < 10) continue;
    if (line.includes('Page') || line.includes('Generated')) continue;
    
    // Try each pattern
    for (const pattern of config.transactionPatterns) {
      const match = line.match(pattern);
      if (match) {
        const transaction = parseTransactionMatch(match, line, config, currentBalance);
        if (transaction) {
          transactions.push(transaction);
          // Update running balance
          if (transaction.type === 'CREDIT') {
            currentBalance += parseFloat(transaction.amount);
          } else {
            currentBalance -= parseFloat(transaction.amount);
          }
        }
        break;
      }
    }
    
    // Alternative: Try to parse as a multi-line transaction
    if (i < lines.length - 1) {
      const nextLine = lines[i + 1].trim();
      const combinedLine = line + ' ' + nextLine;
      
      for (const pattern of config.transactionPatterns) {
        const match = combinedLine.match(pattern);
        if (match) {
          const transaction = parseTransactionMatch(match, combinedLine, config, currentBalance);
          if (transaction) {
            transactions.push(transaction);
            if (transaction.type === 'CREDIT') {
              currentBalance += parseFloat(transaction.amount);
            } else {
              currentBalance -= parseFloat(transaction.amount);
            }
            i++; // Skip next line
          }
          break;
        }
      }
    }
  }
  
  return transactions;
}

function parseTransactionMatch(match, fullLine, config, currentBalance) {
  try {
    // Extract date
    const dateStr = match[1];
    const valueDate = parseDate(dateStr, config.dateFormats);
    
    // Extract amount and type
    let amount, type, narration, txnId;
    
    // Different banks have different formats
    if (match.length >= 5) {
      // Format: Date, TxnId/Description, Amount, Type, Balance
      if (/^\d+$/.test(match[2])) {
        // Has transaction ID
        txnId = match[2];
        amount = match[3].replace(/,/g, '');
        narration = match[4] || '';
      } else {
        // No transaction ID
        narration = match[2];
        amount = match[3].replace(/,/g, '');
        type = match[4];
      }
    } else if (match.length >= 4) {
      // Simpler format
      narration = match[2];
      amount = match[3].replace(/,/g, '');
    }
    
    // Determine transaction type from narration or explicit type
    if (!type) {
      type = detectTransactionType(fullLine, narration);
    } else {
      type = type.toUpperCase().includes('CR') ? 'CREDIT' : 'DEBIT';
    }
    
    // Detect transaction mode
    const mode = detectTransactionModeFromNarration(narration, config.narrationKeywords);
    
    return {
      mode: mode,
      type: type,
      txnId: txnId || generateTransactionId().toString(),
      amount: amount,
      narration: cleanNarration(narration),
      reference: "",
      valueDate: valueDate,
      currentBalance: currentBalance.toFixed(2),
      transactionTimestamp: generateTimestamp(valueDate)
    };
  } catch (error) {
    console.error('Error parsing transaction:', error);
    return null;
  }
}

function parseDate(dateStr, formats) {
  // Try each format
  for (const format of formats) {
    try {
      const parts = dateStr.split(/[-\/]/);
      if (parts.length === 3) {
        let day = parseInt(parts[0]);
        let month = parseInt(parts[1]);
        let year = parseInt(parts[2]);
        
        // Handle 2-digit year
        if (year < 100) {
          year = year > 50 ? 1900 + year : 2000 + year;
        }
        
        const date = new Date(year, month - 1, day);
        if (!isNaN(date)) {
          return date.toISOString().split('T')[0];
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  // Default to current date if parsing fails
  return new Date().toISOString().split('T')[0];
}

function detectTransactionType(line, narration) {
  const creditKeywords = ['CR', 'CREDIT', 'DEP', 'DEPOSIT', 'RECEIVED', 'REVERSE'];
  const debitKeywords = ['DR', 'DEBIT', 'WDL', 'WITHDRAWAL', 'PAYMENT', 'TRANSFER'];
  
  const upperLine = line.toUpperCase();
  const upperNarration = narration.toUpperCase();
  
  for (const keyword of creditKeywords) {
    if (upperLine.includes(keyword) || upperNarration.includes(keyword)) {
      return 'CREDIT';
    }
  }
  
  for (const keyword of debitKeywords) {
    if (upperLine.includes(keyword) || upperNarration.includes(keyword)) {
      return 'DEBIT';
    }
  }
  
  // Default to DEBIT
  return 'DEBIT';
}

function detectTransactionModeFromNarration(narration, keywords) {
  const upperNarration = narration.toUpperCase();
  
  for (const [mode, modeKeywords] of Object.entries(keywords)) {
    for (const keyword of modeKeywords) {
      if (upperNarration.includes(keyword.toUpperCase())) {
        return mode;
      }
    }
  }
  
  return 'OTHERS';
}

function cleanNarration(narration) {
  // Clean up narration
  return narration
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s*-\s*$/, '');
}

function generateTransactionId() {
  return Math.floor(Math.random() * 900000000) + 100000000;
}

function generateTimestamp(dateStr) {
  try {
    const date = new Date(dateStr);
    // Add random time between 1:00 and 23:00
    date.setHours(Math.floor(Math.random() * 22) + 1);
    date.setMinutes(Math.floor(Math.random() * 60));
    date.setSeconds(Math.floor(Math.random() * 60));
    return date.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

export default {
  bankConfigs,
  extractBankTransactions
};
