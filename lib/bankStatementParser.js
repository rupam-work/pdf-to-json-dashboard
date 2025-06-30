const pdfParse = require('pdf-parse');

class BankStatementParser {
  constructor() {
    this.patterns = {
      // Account patterns
      accountNumber: /(?:Account\s*(?:Number|No)?[:\s]*|A\/C\s*(?:Number|No)?[:\s]*|Acc\s*(?:Number|No)?[:\s]*)([0-9X]{10,20})/i,
      maskedAccountNumber: /XXXXX+[0-9]{4,6}/,
      
      // Bank patterns
      bankName: /(?:Bank[:\s]*|Banking\s*with[:\s]*)([\w\s]+Bank[\w\s]*)/i,
      ifscCode: /(?:IFSC[:\s]*|IFS\s*Code[:\s]*)([\w]{11})/i,
      micrCode: /(?:MICR[:\s]*|MICR\s*Code[:\s]*)([0-9]{9})/i,
      branch: /(?:Branch[:\s]*|Branch\s*Code[:\s]*)([0-9]{4,6})/i,
      
      // Personal details patterns
      name: /(?:Name[:\s]*|Customer\s*Name[:\s]*|Account\s*Holder[:\s]*)([\w\s]+?)(?=\n|DOB|Date|Mobile|Email|$)/i,
      pan: /(?:PAN[:\s]*|PAN\s*Number[:\s]*)([A-Z]{5}[0-9]{4}[A-Z])/i,
      mobile: /(?:Mobile[:\s]*|Phone[:\s]*|Contact[:\s]*)([0-9]{10})/i,
      email: /(?:Email[:\s]*|E-mail[:\s]*)([\w.-]+@[\w.-]+\.[\w]+)/i,
      dob: /(?:DOB[:\s]*|Date\s*of\s*Birth[:\s]*)([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{2,4})/i,
      address: /(?:Address[:\s]*|Registered\s*Address[:\s]*)([\w\s,.-]+?)(?=\n(?:Mobile|Email|PAN)|$)/i,
      
      // Balance patterns
      currentBalance: /(?:Current\s*Balance[:\s]*|Available\s*Balance[:\s]*|Balance[:\s]*)([\d,]+\.?\d*)/i,
      drawingLimit: /(?:Drawing\s*Limit[:\s]*|Limit[:\s]*)([\d,]+\.?\d*)/i,
      
      // Transaction patterns
      transactionLine: /([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{2,4})\s+([\w\s\/\-]+?)\s+([\d,]+\.?\d{2})\s*(?:DR|CR)?\s*([\d,]+\.?\d{2})/g,
      upiTransaction: /UPI[\/\s]+(DR|CR)[\/\s]+([0-9]+)[\/\s]+([\w\s]+)[\/\s]+/i,
      atmTransaction: /ATM\s+(WDL|DEP|CASH)[\/\s]+/i,
      neftImps: /(NEFT|IMPS|RTGS)[\/\s\*]+/i,
      
      // Date patterns
      dateRange: /(?:Statement\s*Period[:\s]*|Period[:\s]*|From[:\s]*)([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{2,4})\s*(?:to|-)\s*([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{2,4})/i,
      valueDate: /([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{2,4})/,
      
      // Amount patterns
      amount: /([\d,]+\.?\d{2})/,
      debitCredit: /(DR|CR|DEBIT|CREDIT)/i
    };
  }

  async parsePDF(pdfBuffer) {
    try {
      const data = await pdfParse(pdfBuffer);
      const text = data.text;
      
      return this.parseStatementText(text);
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  parseStatementText(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    const result = {
      ver: "1.21.0",
      status: "success",
      data: [{
        linkReferenceNumber: this.generateLinkReference(),
        maskedAccountNumber: this.extractMaskedAccountNumber(text),
        fiType: "DEPOSIT",
        bank: this.extractBankName(text),
        Profile: this.extractProfile(text),
        Summary: this.extractSummary(text),
        Transactions: this.extractTransactions(text, lines)
      }]
    };
    
    return result;
  }

  generateLinkReference() {
    // Generate UUID-like reference
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  extractMaskedAccountNumber(text) {
    const match = text.match(this.patterns.maskedAccountNumber);
    if (match) return match[0];
    
    // Try to find regular account number and mask it
    const accountMatch = text.match(this.patterns.accountNumber);
    if (accountMatch) {
      const accNum = accountMatch[1];
      return 'X'.repeat(accNum.length - 4) + accNum.slice(-4);
    }
    
    return "XXXXXXXXXXXXX0000";
  }

  extractBankName(text) {
    const match = text.match(this.patterns.bankName);
    if (match) return match[1].trim().toUpperCase();
    
    // Common bank names
    const banks = ['STATE BANK OF INDIA', 'HDFC BANK', 'ICICI BANK', 'AXIS BANK', 'PUNJAB NATIONAL BANK'];
    for (const bank of banks) {
      if (text.toUpperCase().includes(bank)) return bank;
    }
    
    return "BANK";
  }

  extractProfile(text) {
    const profile = {
      Holders: {
        type: "SINGLE",
        Holder: [{
          dob: "",
          pan: "",
          name: "",
          email: "",
          mobile: "",
          address: "",
          nominee: "",
          landline: "",
          ckycCompliance: "true"
        }]
      }
    };

    // Extract holder details
    const holder = profile.Holders.Holder[0];
    
    const nameMatch = text.match(this.patterns.name);
    if (nameMatch) holder.name = nameMatch[1].trim();
    
    const panMatch = text.match(this.patterns.pan);
    if (panMatch) holder.pan = panMatch[1];
    
    const mobileMatch = text.match(this.patterns.mobile);
    if (mobileMatch) holder.mobile = mobileMatch[1];
    
    const emailMatch = text.match(this.patterns.email);
    if (emailMatch) holder.email = emailMatch[1];
    
    const dobMatch = text.match(this.patterns.dob);
    if (dobMatch) {
      holder.dob = this.formatDate(dobMatch[1], 'YYYY-MM-DD');
    }
    
    const addressMatch = text.match(this.patterns.address);
    if (addressMatch) holder.address = addressMatch[1].trim();
    
    return profile;
  }

  extractSummary(text) {
    const summary = {
      type: "SAVINGS",
      branch: "",
      status: "ACTIVE",
      currency: "INR",
      ifscCode: "",
      micrCode: "",
      drawingLimit: "0.00",
      currentBalance: "0.00",
      balanceDateTime: new Date().toISOString()
    };

    const branchMatch = text.match(this.patterns.branch);
    if (branchMatch) summary.branch = branchMatch[1];
    
    const ifscMatch = text.match(this.patterns.ifscCode);
    if (ifscMatch) summary.ifscCode = ifscMatch[1];
    
    const micrMatch = text.match(this.patterns.micrCode);
    if (micrMatch) summary.micrCode = micrMatch[1];
    
    const balanceMatch = text.match(this.patterns.currentBalance);
    if (balanceMatch) {
      summary.currentBalance = this.normalizeAmount(balanceMatch[1]);
      summary.drawingLimit = summary.currentBalance;
    }
    
    // Determine account type
    if (text.toUpperCase().includes('CURRENT')) {
      summary.type = "CURRENT";
    } else if (text.toUpperCase().includes('SAVINGS') || text.toUpperCase().includes('SAVING')) {
      summary.type = "SAVINGS";
    }
    
    return summary;
  }

  extractTransactions(text, lines) {
    const transactions = {
      endDate: "",
      startDate: "",
      Transaction: []
    };

    // Extract date range
    const dateRangeMatch = text.match(this.patterns.dateRange);
    if (dateRangeMatch) {
      transactions.startDate = this.formatDate(dateRangeMatch[1], 'YYYY-MM-DD');
      transactions.endDate = this.formatDate(dateRangeMatch[2], 'YYYY-MM-DD');
    }

    // Parse transactions
    let currentBalance = 0;
    let txnId = 100000000;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const transaction = this.parseTransactionLine(line, lines, i);
      
      if (transaction) {
        transaction.txnId = (txnId++).toString();
        
        // Calculate running balance
        if (transaction.type === 'CREDIT') {
          currentBalance += parseFloat(transaction.amount);
        } else {
          currentBalance -= parseFloat(transaction.amount);
        }
        
        transaction.currentBalance = this.formatCurrency(currentBalance);
        transactions.Transaction.push(transaction);
      }
    }

    // If no transactions found, look for structured transaction patterns
    if (transactions.Transaction.length === 0) {
      transactions.Transaction = this.extractStructuredTransactions(text);
    }

    return transactions;
  }

  parseTransactionLine(line, lines, index) {
    // Check for date at start of line
    const dateMatch = line.match(/^([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{2,4})/);
    if (!dateMatch) return null;

    const transaction = {
      mode: "OTHERS",
      type: "DEBIT",
      txnId: "",
      amount: "0.00",
      narration: "",
      reference: "",
      valueDate: "",
      currentBalance: "0.00",
      transactionTimestamp: ""
    };

    // Set value date
    transaction.valueDate = this.formatDate(dateMatch[1], 'YYYY-MM-DD');
    transaction.transactionTimestamp = new Date(transaction.valueDate + 'T12:00:00.000Z').toISOString();

    // Extract rest of the line
    const restOfLine = line.substring(dateMatch[0].length).trim();
    
    // Check for amount and DR/CR
    const amountMatch = restOfLine.match(/([\d,]+\.?\d{2})\s*(DR|CR|DEBIT|CREDIT)?/i);
    if (amountMatch) {
      transaction.amount = this.normalizeAmount(amountMatch[1]);
      transaction.type = (amountMatch[2] && amountMatch[2].toUpperCase().startsWith('C')) ? 'CREDIT' : 'DEBIT';
    }

    // Extract narration (everything between date and amount)
    const narrationEndIndex = restOfLine.lastIndexOf(amountMatch ? amountMatch[0] : '');
    transaction.narration = restOfLine.substring(0, narrationEndIndex).trim();

    // Determine transaction mode
    transaction.mode = this.determineTransactionMode(transaction.narration);

    // Process multi-line narrations
    if (index + 1 < lines.length && !lines[index + 1].match(/^([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{2,4})/)) {
      transaction.narration += ' ' + lines[index + 1].trim();
    }

    return transaction;
  }

  extractStructuredTransactions(text) {
    const transactions = [];
    const txnMatches = text.matchAll(/([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{2,4})\s+(.*?)\s+([\d,]+\.?\d{2})\s*(DR|CR|DEBIT|CREDIT)?\s+([\d,]+\.?\d{2})/g);
    
    let txnId = 100000000;
    for (const match of txnMatches) {
      const transaction = {
        mode: "OTHERS",
        type: match[4] && match[4].toUpperCase().startsWith('C') ? 'CREDIT' : 'DEBIT',
        txnId: (txnId++).toString(),
        amount: this.normalizeAmount(match[3]),
        narration: match[2].trim(),
        reference: "",
        valueDate: this.formatDate(match[1], 'YYYY-MM-DD'),
        currentBalance: this.normalizeAmount(match[5]),
        transactionTimestamp: new Date(this.formatDate(match[1], 'YYYY-MM-DD') + 'T12:00:00.000Z').toISOString()
      };
      
      transaction.mode = this.determineTransactionMode(transaction.narration);
      transactions.push(transaction);
    }
    
    return transactions;
  }

  determineTransactionMode(narration) {
    const upper = narration.toUpperCase();
    
    if (upper.includes('UPI')) return 'UPI';
    if (upper.includes('ATM')) return 'ATM';
    if (upper.includes('CASH')) return 'CASH';
    if (upper.includes('NEFT') || upper.includes('IMPS') || upper.includes('RTGS')) return 'OTHERS';
    if (upper.includes('CARD') || upper.includes('DEBIT CARD') || upper.includes('CREDIT CARD')) return 'CARD';
    if (upper.includes('CHEQUE') || upper.includes('CHQ')) return 'CHEQUE';
    
    return 'OTHERS';
  }

  normalizeAmount(amount) {
    if (!amount) return "0.00";
    return amount.toString().replace(/[,]/g, '');
  }

  formatCurrency(amount) {
    const num = parseFloat(amount);
    if (num >= 1000) {
      return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toFixed(2);
  }

  formatDate(dateStr, format = 'YYYY-MM-DD') {
    if (!dateStr) return '';
    
    // Parse date
    const parts = dateStr.split(/[\/\-]/);
    let day, month, year;
    
    if (parts.length === 3) {
      // Assume DD/MM/YYYY or DD-MM-YYYY
      day = parts[0].padStart(2, '0');
      month = parts[1].padStart(2, '0');
      year = parts[2];
      
      // Convert 2-digit year to 4-digit
      if (year.length === 2) {
        year = (parseInt(year) > 50 ? '19' : '20') + year;
      }
    } else {
      return dateStr;
    }
    
    if (format === 'YYYY-MM-DD') {
      return `${year}-${month}-${day}`;
    }
    
    return dateStr;
  }
}

module.exports = BankStatementParser;
