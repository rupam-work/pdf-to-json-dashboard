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
      linkReferenceNumber: extractField(text, "Account.*?ID|Application.*?ID|Proposal ID", "").trim(),
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
    address: extractField(text, "Address\\s+([^\\n]+(?:\\n[^\\n]+)*?)(?=Nominee|Ckyc|$)", "").replace(/\\s+/g, ' ').trim(),
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
    branch: extractField(text, "Branch\\s+([^\\n]+?)(?=Facility|IFSC)", ""),
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

  // Extract transaction table
  const transactionPattern = /([A-Z]\\d+)\\s+(CREDIT|DEBIT)\\s+(UPI|OTHERS|CASH|TRANSFER|NEFT|RTGS|IMPS)\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\dT:.Z-]+)\\s+([\\dT:.Z-]+)\\s+([^\\n]+?)(?=\\s*$|\\s*[A-Z]\\d+)/gm;
  
  let match;
  while ((match = transactionPattern.exec(text)) !== null) {
    const transaction = {
      type: match[2],
      mode: match[3],
      amount: match[4],
      currentBalance: match[5],
      transactionTimestamp: match[6],
      valueDate: match[7],
      txnId: match[1],
      narration: match[8].trim(),
      reference: ""
    };
    transactions.Transaction.push(transaction);
  }

  // If regex doesn't work, try alternative parsing
  if (transactions.Transaction.length === 0) {
    const lines = text.split('\\n');
    let inTransactionSection = false;
    
    for (let line of lines) {
      if (line.includes('Transaction') && line.includes('Type') && line.includes('Mode')) {
        inTransactionSection = true;
        continue;
      }
      
      if (inTransactionSection && line.trim()) {
        const parts = line.trim().split(/\\s{2,}/);
        if (parts.length >= 8 && (parts[1] === 'CREDIT' || parts[1] === 'DEBIT')) {
          const transaction = {
            type: parts[1],
            mode: parts[2],
            amount: parts[3],
            currentBalance: parts[4],
            transactionTimestamp: parts[5],
            valueDate: parts[6],
            txnId: parts[0],
            narration: parts[7] || "",
            reference: parts[8] || ""
          };
          transactions.Transaction.push(transaction);
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
  const match = text.match(/X{3,}\\d{4}/);
  return match ? match[0] : "";
}

function extractBankName(text) {
  const match = text.match(/([A-Za-z\\s]+Bank[A-Za-z\\s]*?)\\s*-\\s*Deposit/i);
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

// Enhanced transaction parser for complex formats
export function parseTransactionTable(text) {
  const transactions = [];
  
  // Split by pages if needed
  const pages = text.split('PDF Downloaded Date');
  
  for (let page of pages) {
    // Find transaction table headers
    const headerMatch = page.match(/Transaction.*?Id.*?Type.*?Mode.*?Amount.*?Current.*?Balance/i);
    if (!headerMatch) continue;
    
    const startIndex = page.indexOf(headerMatch[0]) + headerMatch[0].length;
    const transactionText = page.substring(startIndex);
    
    // Parse each transaction line
    const lines = transactionText.split('\\n');
    let currentTransaction = {};
    let fieldCount = 0;
    
    for (let line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Check if this is a transaction ID (starts with letter followed by numbers)
      if (/^[A-Z]\\d{7,}/.test(trimmedLine)) {
        // Save previous transaction if exists
        if (fieldCount > 0) {
          transactions.push(currentTransaction);
        }
        
        // Start new transaction
        currentTransaction = { txnId: trimmedLine };
        fieldCount = 1;
      } else if (fieldCount > 0) {
        // Continue building current transaction
        switch (fieldCount) {
          case 1: currentTransaction.type = trimmedLine; break;
          case 2: currentTransaction.mode = trimmedLine; break;
          case 3: currentTransaction.amount = trimmedLine; break;
          case 4: currentTransaction.currentBalance = trimmedLine; break;
          case 5: currentTransaction.transactionTimestamp = trimmedLine; break;
          case 6: currentTransaction.valueDate = trimmedLine; break;
          case 7: 
            currentTransaction.narration = trimmedLine;
            currentTransaction.reference = "";
            break;
        }
        fieldCount++;
        
        // If we have all fields, add to transactions
        if (fieldCount > 7) {
          transactions.push(currentTransaction);
          currentTransaction = {};
          fieldCount = 0;
        }
      }
    }
    
    // Don't forget the last transaction
    if (fieldCount > 0) {
      transactions.push(currentTransaction);
    }
  }
  
  return transactions;
}
