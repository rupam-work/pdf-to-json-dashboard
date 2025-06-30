// Enhanced Bank Statement Parser
// This parser extracts all fields from bank statement PDFs according to the AA FI format

export function parseBankStatement(text) {
  const result = {
    ver: "1.21.0",
    status: "success",
    data: []
  };

  try {
    // Extract consent details
    const consentDetails = extractConsentDetails(text);
    
    // Extract account information
    const accountData = {
      linkReferenceNumber: extractField(text, "Account.*?ID|Application.*?ID|Proposal ID", "").replace(/\s+/g, '').trim(),
      maskedAccountNumber: extractMaskedAccountNumber(text),
      fiType: "DEPOSIT",
      bank: extractBankName(text),
      Profile: extractProfile(text),
      Summary: extractSummary(text),
      Transactions: extractTransactions(text)
    };

    result.data.push(accountData);
  } catch (error) {
    result.status = "error";
    result.error = error.message;
  }

  return result;
}

function extractConsentDetails(text) {
  return {
    requestedBy: extractField(text, "Requested By\\s*([\\w\\s]+?)(?=AA Handle|$)"),
    aaHandle: extractField(text, "AA Handle\\s*([\\w]+)"),
    accountId: extractField(text, "Account.*?ID\\s*([\\w-]+)"),
    consentId: extractField(text, "Consent ID\\s*([\\w-]+)"),
    consentHandleId: extractField(text, "ConsentHandle ID\\s*([\\w-]+)"),
    consentRequestDate: extractField(text, "Consent request\\s*date\\s*([\\d-]+\\w+)"),
    consentValidity: extractField(text, "Consent Validity\\s*([\\d-]+\\w+)"),
    purpose: extractField(text, "Purpose\\s*([^\\n]+?)(?=Purpose Category)"),
    purposeCategory: extractField(text, "Purpose Category\\s*([^\\n]+)"),
    fetchType: extractField(text, "Fetch Type\\s*([\\w]+)"),
    frequency: extractField(text, "Frequency\\s*([^\\n]+)"),
    dataLife: extractField(text, "Data Life\\s*([\\w]+)"),
    dataDeliveredOn: extractField(text, "Data Delivered On\\s*([\\d-]+\\w+)"),
    financialDataPeriod: extractField(text, "Financial Data\\s*Period\\s*([^\\n]+)")
  };
}

function extractProfile(text) {
  const profile = {
    Holders: {
      type: "SINGLE",
      Holder: []
    }
  };

  // Extract holder information
  const holder = {
    name: extractField(text, "Name\\s+([A-Z\\s]+?)(?=Mobile|Email|DOB)", ""),
    dob: extractField(text, "DOB\\s+([\\d-]+)", ""),
    mobile: extractField(text, "Mobile No\\s+([\\d+]+)", ""),
    ckycCompliance: extractField(text, "Ckyc compliance\\s+(\\w+)", "true"),
    nominee: extractField(text, "Nominee\\s+([\\w]+)", ""),
    landline: extractField(text, "Landline\\s+([\\d]*)", ""),
    address: extractField(text, "Address\\s+([^\\n]+(?:\\n[^\\n]+)*?)(?=Nominee|Ckyc|$)", "").replace(/\s+/g, ' ').trim(),
    email: extractField(text, "Email\\s+([^\\s]+@[^\\s]+)", ""),
    pan: extractField(text, "PAN No\\s+([A-Z0-9]+)", "")
  };

  // Check if it's joint account
  const accountType = extractField(text, "Type\\s+(SINGLE|JOINT)", "SINGLE");
  profile.Holders.type = accountType;
  
  profile.Holders.Holder.push(holder);

  return profile;
}

function extractSummary(text) {
  return {
    exchgeRate: "",
    currentBalance: extractField(text, "Current Balance\\s+([\\d.]+)", "0"),
    currency: "INR",
    balanceDateTime: extractField(text, "Balance Date Time\\s+([\\dT:.Z-]+)", ""),
    type: extractField(text, "Account Type\\s+(\\w+)", "SAVINGS"),
    branch: extractField(text, "Branch\\s+([^\\n]+?)(?=Facility|IFSC)", "").trim(),
    facility: extractField(text, "Facility\\s+([^\\n]*)", ""),
    ifscCode: extractField(text, "IFSC Code\\s+([A-Z0-9]+)", ""),
    micrCode: extractField(text, "MICR Code\\s+([\\d]*)", ""),
    openingDate: extractField(text, "Opening Date\\s+([\\d-]+)", ""),
    currentODLimit: extractField(text, "Current OD Limit\\s+([\\d.]+)", "0.0"),
    drawingLimit: extractField(text, "Drawing Limit\\s+([\\d.]+)", "0.0"),
    status: extractField(text, "Status\\s+(ACTIVE|INACTIVE|DORMANT)", "ACTIVE"),
    Pending: []
  };
}

function extractTransactions(text) {
  const transactions = {
    startDate: extractField(text, "Start Date\\s+([\\d-]+)", ""),
    endDate: extractField(text, "End Date\\s+([\\d-]+)", ""),
    Transaction: []
  };

  // Method 1: Try to extract transactions from structured format
  const transactionLines = extractTransactionLines(text);
  
  if (transactionLines.length > 0) {
    transactions.Transaction = transactionLines;
  } else {
    // Method 2: Try alternative parsing approach
    transactions.Transaction = parseTransactionTable(text);
  }

  return transactions;
}

function extractTransactionLines(text) {
  const transactions = [];
  
  // Look for transaction patterns
  // Pattern 1: Standard format with all fields in sequence
  const pattern1 = /([A-Z]\d{7,})\s+(CREDIT|DEBIT)\s+(UPI|OTHERS|CASH|TRANSFER|NEFT|RTGS|IMPS)\s+([\\d.]+)\s+([\\d.]+)\s+([\\d-]+T[\\d:.]+Z?)\s+([\\d-]+T[\\d:.]+Z?)\s+([^\\n]+?)(?=\s*(?:[A-Z]\d{7,}|$))/gm;
  
  let match;
  while ((match = pattern1.exec(text)) !== null) {
    transactions.push({
      type: match[2],
      mode: match[3],
      amount: match[4],
      currentBalance: match[5],
      transactionTimestamp: match[6],
      valueDate: match[7],
      txnId: match[1],
      narration: match[8].trim(),
      reference: ""
    });
  }

  // Pattern 2: Multi-line format where fields might be on different lines
  if (transactions.length === 0) {
    const lines = text.split('\n');
    let i = 0;
    
    // Find the start of transactions section
    while (i < lines.length && !lines[i].includes('Transaction') && !lines[i].includes('Type') && !lines[i].includes('Mode')) {
      i++;
    }
    
    // Skip header
    while (i < lines.length && !lines[i].match(/^[A-Z]\d{7,}/)) {
      i++;
    }
    
    // Parse transactions
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Check if this line starts with a transaction ID
      if (/^[A-Z]\d{7,}/.test(line)) {
        const parts = line.split(/\s+/);
        
        if (parts.length >= 8) {
          // All fields on one line
          transactions.push({
            txnId: parts[0],
            type: parts[1],
            mode: parts[2],
            amount: parts[3],
            currentBalance: parts[4],
            transactionTimestamp: parts[5],
            valueDate: parts[6],
            narration: parts.slice(7).join(' '),
            reference: ""
          });
        } else {
          // Fields might be on multiple lines
          let txn = { txnId: parts[0] };
          let fieldIndex = 1;
          let partIndex = 1;
          
          // Collect fields from current and subsequent lines
          while (fieldIndex <= 7 && i < lines.length) {
            while (partIndex < parts.length && fieldIndex <= 7) {
              switch (fieldIndex) {
                case 1: txn.type = parts[partIndex]; break;
                case 2: txn.mode = parts[partIndex]; break;
                case 3: txn.amount = parts[partIndex]; break;
                case 4: txn.currentBalance = parts[partIndex]; break;
                case 5: txn.transactionTimestamp = parts[partIndex]; break;
                case 6: txn.valueDate = parts[partIndex]; break;
                case 7: 
                  txn.narration = parts.slice(partIndex).join(' ');
                  txn.reference = "";
                  fieldIndex = 8; // Exit loop
                  break;
              }
              partIndex++;
              fieldIndex++;
            }
            
            if (fieldIndex <= 7) {
              i++;
              if (i < lines.length && !lines[i].match(/^[A-Z]\d{7,}/)) {
                parts = lines[i].trim().split(/\s+/);
                partIndex = 0;
              } else {
                break;
              }
            }
          }
          
          if (txn.type && txn.amount) {
            transactions.push(txn);
          }
        }
      }
      i++;
    }
  }

  return transactions;
}

function parseTransactionTable(text) {
  const transactions = [];
  
  // Clean up text and normalize spaces
  const cleanText = text.replace(/\s+/g, ' ').replace(/\n+/g, '\n');
  
  // Find all transaction IDs and extract data around them
  const txnIdPattern = /[A-Z]\d{7,}/g;
  const txnIds = cleanText.match(txnIdPattern) || [];
  
  txnIds.forEach(txnId => {
    // Look for transaction data pattern around each ID
    const txnPattern = new RegExp(
      `${txnId}\\s+(CREDIT|DEBIT)\\s+(UPI|OTHERS|CASH|TRANSFER|NEFT|RTGS|IMPS)\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d-]+T[\\d:.]+Z?)\\s+([\\d-]+T[\\d:.]+Z?)\\s+([^${txnId.charAt(0)}][^\\n]*?)(?=\\s*[A-Z]\\d{7,}|$)`,
      'i'
    );
    
    const match = cleanText.match(txnPattern);
    if (match) {
      transactions.push({
        txnId: txnId,
        type: match[1],
        mode: match[2],
        amount: match[3],
        currentBalance: match[4],
        transactionTimestamp: match[5],
        valueDate: match[6],
        narration: match[7].trim(),
        reference: ""
      });
    }
  });

  // If still no transactions found, try a more aggressive approach
  if (transactions.length === 0) {
    // Split by transaction IDs
    const parts = cleanText.split(/([A-Z]\d{7,})/);
    
    for (let i = 1; i < parts.length; i += 2) {
      const txnId = parts[i];
      const data = parts[i + 1];
      
      if (data) {
        const fields = data.trim().split(/\s+/);
        if (fields.length >= 7 && (fields[0] === 'CREDIT' || fields[0] === 'DEBIT')) {
          transactions.push({
            txnId: txnId,
            type: fields[0],
            mode: fields[1],
            amount: fields[2],
            currentBalance: fields[3],
            transactionTimestamp: fields[4],
            valueDate: fields[5],
            narration: fields.slice(6).join(' '),
            reference: ""
          });
        }
      }
    }
  }

  return transactions;
}

function extractField(text, pattern, defaultValue = "") {
  try {
    const regex = new RegExp(pattern, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

function extractMaskedAccountNumber(text) {
  const match = text.match(/X{3,}\d{4}/);
  return match ? match[0] : "";
}

function extractBankName(text) {
  const match = text.match(/([A-Za-z\s]+Bank[A-Za-z\s]*?)\s*-\s*Deposit/i);
  if (match) return match[1].trim();
  
  // Try alternative patterns
  const bankNames = ["Axis Bank", "HDFC Bank", "ICICI Bank", "SBI", "State Bank of India", 
                     "Kotak Mahindra Bank", "Yes Bank", "Punjab National Bank", "Bank of Baroda",
                     "Canara Bank", "Union Bank of India", "IDBI Bank", "Federal Bank"];
  
  for (let bank of bankNames) {
    if (text.includes(bank)) {
      return bank;
    }
  }
  
  return "Unknown Bank";
}

// Debug function to help identify transaction patterns
export function debugTransactionExtraction(text) {
  console.log("=== Debug Transaction Extraction ===");
  
  // Find potential transaction IDs
  const txnIds = text.match(/[A-Z]\d{7,}/g) || [];
  console.log(`Found ${txnIds.length} potential transaction IDs`);
  
  // Check for transaction headers
  const hasHeader = text.includes('Transaction') && text.includes('Type') && text.includes('Mode');
  console.log(`Transaction header found: ${hasHeader}`);
  
  // Try to find transaction section
  const transactionSectionStart = text.search(/Transaction\s+Id.*?Type.*?Mode/i);
  if (transactionSectionStart !== -1) {
    const snippet = text.substring(transactionSectionStart, transactionSectionStart + 500);
    console.log("Transaction section snippet:", snippet);
  }
  
  return {
    txnIdCount: txnIds.length,
    hasHeader: hasHeader,
    sampleIds: txnIds.slice(0, 5)
  };
}
