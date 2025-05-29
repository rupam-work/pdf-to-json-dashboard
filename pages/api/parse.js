// pages/api/parse.js

import formidable from "formidable";
import fs from "fs";
import axios from "axios";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Utility: Smart mapping function for all 4 AA types
function mapToAAJSON(type, text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  if (type === "MUTUAL_FUND") {
    const profile = {};
    const summary = {};
    const transactions = [];

    for (const line of lines) {
      if (/PAN[:\s]/i.test(line)) profile.pan = line.split(/PAN[:\s]*/i)[1] || "";
      if (/Holder[:\s]/i.test(line)) profile.holder = line.split(/Holder[:\s]*/i)[1] || "";
      if (/Fund[:\s]/i.test(line)) summary.fund = line.split(/Fund[:\s]*/i)[1] || "";
      if (/Units[:\s]/i.test(line)) summary.units = Number(line.split(/Units[:\s]*/i)[1]) || "";
      if (/Value[:\s]/i.test(line)) summary.value = Number(line.split(/Value[:\s]*/i)[1]) || "";
      // Transaction sample: 2024-04-01 Purchase 10
      if (/\d{2,4}-\d{2}-\d{2,4}/.test(line) && /(purchase|sale|switch)/i.test(line)) {
        const [date, action, units] = line.split(/\s+/);
        transactions.push({
          date,
          action,
          units: Number(units)
        });
      }
    }
    return { profile, summary, transactions };
  }

  if (type === "EQUITY") {
    const profile = {};
    const summary = {};
    const transactions = [];
    for (const line of lines) {
      if (/DP[:\s]/i.test(line)) profile.dp = line.split(/DP[:\s]*/i)[1] || "";
      if (/Client\s?ID[:\s]/i.test(line)) profile.client_id = line.split(/Client\s?ID[:\s]*/i)[1] || "";
      if (/Stocks[:\s]/i.test(line)) summary.stocks = Number(line.split(/Stocks[:\s]*/i)[1]) || "";
      if (/Total Value[:\s]/i.test(line)) summary.total_value = Number(line.split(/Total Value[:\s]*/i)[1]) || "";
      // Transaction: 2024-04-05 TCS 2
      if (/\d{2,4}-\d{2}-\d{2,4}/.test(line) && /[A-Z]{2,}/.test(line)) {
        const [date, script, qty] = line.split(/\s+/);
        transactions.push({ date, script, qty: Number(qty) });
      }
    }
    return { profile, summary, transactions };
  }

  if (type === "ETF") {
    const profile = {};
    const summary = {};
    const transactions = [];
    for (const line of lines) {
      if (/Demat[:\s]/i.test(line)) profile.demat = line.split(/Demat[:\s]*/i)[1] || "";
      if (/ETF[:\s]/i.test(line)) profile.etf = line.split(/ETF[:\s]*/i)[1] || "";
      if (/Units[:\s]/i.test(line)) summary.units = Number(line.split(/Units[:\s]*/i)[1]) || "";
      if (/Value[:\s]/i.test(line)) summary.value = Number(line.split(/Value[:\s]*/i)[1]) || "";
      // Transaction: 2024-03-12 NIFTYETF 5
      if (/\d{2,4}-\d{2}-\d{2,4}/.test(line) && /ETF/i.test(line)) {
        const [date, etf, units] = line.split(/\s+/);
        transactions.push({ date, etf, units: Number(units) });
      }
    }
    return { profile, summary, transactions };
  }

  // Default: DEPOSIT (current/savings)
  const profile = {};
  const summary = {};
  const transactions = [];
  for (const line of lines) {
    if (/Name[:\s]/i.test(line)) profile.name = line.split(/Name[:\s]*/i)[1] || "";
    if (/Account[:\s]/i.test(line)) profile.account = line.split(/Account[:\s]*/i)[1] || "";
    if (/Balance[:\s]/i.test(line)) summary.balance = Number(line.split(/Balance[:\s]*/i)[1]) || "";
    if (/Type[:\s]/i.test(line)) summary.type = line.split(/Type[:\s]*/i)[1] || "";
    // Transaction: 2024-05-28 1000 Salary
    if (/\d{2,4}-\d{2}-\d{2,4}/.test(line) && /\d+/.test(line)) {
      const [date, amount, ...narrationArr] = line.split(/\s+/);
      transactions.push({ date, amount: Number(amount), narration: narrationArr.join(" ") });
    }
  }
  return { profile, summary, transactions };
}

// FI type detection
function detectFIType(text) {
  if (/mutual fund/i.test(text)) return "MUTUAL_FUND";
  if (/equity/i.test(text)) return "EQUITY";
  if (/etf/i.test(text)) return "ETF";
  return "DEPOSIT";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err || !files.pdf) {
      return res.status(400).json({ error: "No PDF uploaded" });
    }

    try {
      const pdfPath = files.pdf.filepath || files.pdf.path;
      const pdfBuffer = fs.readFileSync(pdfPath);

      // PDF.co API call
      const pdfcoRes = await axios.post(
        "https://api.pdf.co/v1/pdf/convert/to/text",
        pdfBuffer,
        {
          headers: {
            "Content-Type": "application/pdf",
            "x-api-key": "rupam@onemoney.in_QnyHofU5rttFSoCCV7fJZGshsXCIBAH1lRBtl92hfdEVVqVtMRrZyLT8MDQ6RzUI",
          },
        }
      );

      const { data } = pdfcoRes;
      if (!data || !data.body) {
        throw new Error("PDF.co failed: " + JSON.stringify(data));
      }
      const text = data.body;
      const type = detectFIType(text);
      const mapped = mapToAAJSON(type, text);

      res.status(200).json({ type, text, mapped });
    } catch (e) {
      res.status(500).json({ error: e.message || "Failed to parse PDF" });
    }
  });
}
