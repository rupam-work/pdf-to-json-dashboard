import formidable from 'formidable';
import fs from 'fs';
import pdfParse from 'pdf-parse';

export const config = {
  api: {
    bodyParser: false,
  },
};

function detectType(text) {
  if (/mutual fund/i.test(text)) return 'MUTUAL_FUND';
  if (/equity/i.test(text)) return 'EQUITY';
  if (/etf/i.test(text)) return 'ETF';
  return 'DEPOSIT';
}

function mockAAJson(type, text) {
  // Replace with your real mapping logic!
  if (type === 'DEPOSIT') {
    return {
      profile: { name: "Sample Name", account: "XXXX1234" },
      summary: { balance: 10000, type: "Savings" },
      transactions: [{ date: "2024-05-28", amount: 1000, narration: "Salary" }]
    };
  }
  if (type === 'MUTUAL_FUND') {
    return {
      profile: { holder: "Sample Name", pan: "XXXX1234X" },
      summary: { fund: "ABC Mutual Fund", units: 120, value: 125000 },
      transactions: [{ date: "2024-04-01", action: "Purchase", units: 10 }]
    };
  }
  if (type === 'EQUITY') {
    return {
      profile: { dp: "NSDL", client_id: "123456" },
      summary: { stocks: 5, total_value: 250000 },
      transactions: [{ date: "2024-04-05", script: "TCS", qty: 2 }]
    };
  }
  if (type === 'ETF') {
    return {
      profile: { demat: "CDSL", etf: "NIFTY ETF" },
      summary: { units: 15, value: 25500 },
      transactions: [{ date: "2024-03-12", etf: "NIFTY ETF", units: 5 }]
    };
  }
  return { error: "Unknown type" };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err || !files.pdf) {
      res.status(400).json({ error: "PDF upload failed" });
      return;
    }
    const pdfPath = files.pdf.filepath || files.pdf.path;
    const buffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(buffer);
    const text = data.text || '';
    const type = detectType(text);

    // Replace with your schema mapping function if needed
    const json = mockAAJson(type, text);
    res.status(200).json(json);
  });
}
