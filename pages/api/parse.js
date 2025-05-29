import mapDeposit from '../../mappers/depositMapper.js';
import mapMutualFunds from '../../mappers/mutualFundsMapper.js';
import mapEquities from '../../mappers/equitiesMapper.js';
import formidable from 'formidable';
import { promises as fs } from 'fs';

export const config = { api: { bodyParser: false } };

const PDF_API_KEY = "rupam@onemoney.in_QnyHofU5rttFSoCCV7fJZGshsXCIBAH1lRBtl92hfdEVVqVtMRrZyLT8MDQ6RzUI";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  let fileBuffer = null;

  try {
    const form = formidable({ multiples: false, keepExtensions: true });
    const files = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve(files);
      });
    });

    // On Vercel, always an array:
    if (!files.pdf || !Array.isArray(files.pdf) || !files.pdf[0] || !files.pdf[0].filepath) {
      return res.status(400).json({ error: "No PDF uploaded or path missing" });
    }
    fileBuffer = await fs.readFile(files.pdf[0].filepath);
  } catch (e) {
    console.error('Formidable/FS error:', e);
    return res.status(400).json({ error: "File upload failed" });
  }

  let text;
  try {
    const pdfResponse = await fetch("https://api.pdf.co/v1/pdf/convert/to/text", {
      method: "POST",
      headers: { "x-api-key": PDF_API_KEY, "Content-Type": "application/pdf" },
      body: fileBuffer,
    });
    const data = await pdfResponse.json();
    if (!data || data.error || !data.body) {
      return res.status(500).json({ error: "PDF parse failed: " + (data && data.message ? data.message : "Unknown error") });
    }
    text = data.body;
  } catch (err) {
    console.error('PDF.co fetch error:', err);
    return res.status(500).json({ error: "API request failed: " + err.message });
  }

  let fiType = "DEPOSIT";
  if (/mutual\s*fund/i.test(text)) fiType = "MUTUAL_FUNDS";
  else if (/equities?|demat|depository/i.test(text)) fiType = "EQUITIES";

  let result;
  try {
    if (fiType === "DEPOSIT") result = mapDeposit(text);
    else if (fiType === "MUTUAL_FUNDS") result = mapMutualFunds(text);
    else if (fiType === "EQUITIES") result = mapEquities(text);
    else result = { error: "Unrecognized FI type or mapping not implemented." };
  } catch (err) {
    console.error('Mapping logic error:', err);
    return res.status(500).json({ error: "Mapping logic failed: " + err.message });
  }

  return res.status(200).json(result);
}
