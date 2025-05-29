module.exports = function mapDeposit(text) {
  const name = /Name\s+([^\n]+)/i.exec(text)?.[1]?.trim() ?? "";
  const mobile = /Mobile No\s+([^\n]+)/i.exec(text)?.[1]?.trim() ?? "";
  const email = /Email\s+([^\n]+)/i.exec(text)?.[1]?.trim() ?? "";
  const dob = /DOB\s+([^\n]+)/i.exec(text)?.[1]?.trim() ?? "";
  const pan = /PAN No\s+([^\n]+)/i.exec(text)?.[1]?.trim() ?? "";
  const address = /Address\s+([^\n]+)/i.exec(text)?.[1]?.trim() ?? "";
  const nominee = /Nominee\s+([^\n]+)/i.exec(text)?.[1]?.trim() ?? "";
  const account = /IDFC FIRST BANK - Deposit - ([\wX]+)/i.exec(text)?.[1]?.trim() ?? "";
  const currentBalance = /Current Balance\s+([0-9.]+)/i.exec(text)?.[1]?.trim() ?? "";
  const accountType = /Type\s+([^\n]+)/i.exec(text)?.[1]?.trim() ?? "";

  // Transaction extraction: You can tune regex for your PDFs
  const transactions = [];
  const txnRegex = /(\d{15,})\s+(DEBIT|CREDIT)\s+([A-Z]+)\s+([0-9.]+)\s+([0-9.]+)\s+(\d{4}-\d{2}-\d{2}T[^\s]+)\s+(\d{4}-\d{2}-\d{2})\s+([^\n]+)/g;
  let match;
  while ((match = txnRegex.exec(text))) {
    transactions.push({
      transactionId: match[1],
      type: match[2],
      mode: match[3],
      amount: match[4],
      currentBalance: match[5],
      transactionTimestamp: match[6],
      valueDate: match[7],
      narration: match[8],
    });
  }

  return {
    ver: "1.21.0",
    status: "success",
    data: [
      {
        linkReferenceNumber: "",
        maskedAccountNumber: account,
        fiType: "DEPOSIT",
        bank: "IDFC FIRST BANK",
        Profile: {
          Holders: {
            Holder: [
              { dob, pan, name, email, mobile, address, nominee, landline: "" }
            ]
          }
        },
        Summary: {
          currentBalance,
          accountType,
        },
        Transactions: {
          startDate: "",
          endDate: "",
          Transaction: transactions,
        },
      },
    ],
  };
};
