import formidable from "formidable";
import fs from "fs";
import axios from "axios";

export const config = {
  api: {
    bodyParser: false,
  },
};

function mapToAAJSON(type, text) {
  if (type === "MUTUAL_FUND") {
    return {
      profile: { holder: "Sample Name", pan: "XXXX1234X" },
      summary: { fund: "ABC Mutual Fund", units: 120, value: 125000 },
      transactions: [{ date: "2024-04-01", action: "Purchase", units: 10 }],
    };
  }
  if (type === "EQUITY") {
    return {
      profile: { dp: "NSDL", client_id: "123456" },
      summary: { stocks: 5, total_value: 250000 },
      transactions: [{ date: "2024-04-05", script: "TCS", qty: 2 }],
    };
  }
  if (type === "ETF") {
    return {
      profile: { demat: "CDSL", etf: "NIFTY ETF" },
      summary: { units: 15, value: 25500 },
      transactions: [{ date: "2024-03-12", etf: "NIFTY ETF", units: 5 }],
    };
  }
  // Default: DEPOSIT
  return {
    profile: { name: "Sample Name", account: "XXXX1234" },
    summary: { balance: 10000, type: "Savings" },
    transactions: [{ date: "2024-05-28", amount: 1000, narration: "Salary" }],
  };
}

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

      // PDF.co integration
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
