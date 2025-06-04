import mapDeposit from '../../mappers/depositMapper.js';
import mapMutualFunds from '../../mappers/mutualFundsMapper.js';
import mapEquities from '../../mappers/equitiesMapper.js';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import FormData from 'form-data';

export const config = { api: { bodyParser: false } };

const PDF_API_KEY = process.env.PDF_CO_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  let fileBuffer = null;
  let mimeType = 'application/pdf';
  let text;
  let tempPath = null;
  let files = null;

  try {
    const form = formidable({ multiples: false, keepExtensions: true });
    files = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve(files);
      });
    });

    // On Vercel, always an array:
    if (!files.pdf || !Array.isArray(files.pdf) || !files.pdf[0] || !files.pdf[0].filepath) {
      return res.status(400).json({ error: "No file uploaded or path missing" });
    }
    tempPath = files.pdf[0].filepath;
    fileBuffer = await fs.readFile(tempPath);
    mimeType = files.pdf[0].mimetype || mimeType;
  } catch (e) {
    console.error('Formidable/FS error:', e);
    return res.status(400).json({ error: "File upload failed" });
  }
  try {
    // upload file to PDF.co first using multipart/form-data
    const uploadForm = new FormData();
    uploadForm.append('file', fileBuffer, {
      filename: files.pdf[0].originalFilename || 'upload.pdf',
      contentType: mimeType,
    });
    const uploadRes = await fetch("https://api.pdf.co/v1/file/upload", {
      method: "POST",
      headers: {
        "x-api-key": PDF_API_KEY,
        ...uploadForm.getHeaders(),
      },
      body: uploadForm,
    });
    const uploadData = await uploadRes.json();
    if (!uploadData || !uploadData.url) {
      return res.status(500).json({ error: "PDF file upload to PDF.co failed: " + (uploadData.message || 'No URL returned') });
    }
    const pdfUrl = uploadData.url;

    const pdfResponse = await fetch("https://api.pdf.co/v1/pdf/convert/to/text", {
      method: "POST",
      headers: {
        "x-api-key": PDF_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: pdfUrl }),
    });
    const data = await pdfResponse.json();
    if (!data || data.error || !data.body) {
      return res.status(500).json({ error: "File parse failed: " + (data && data.message ? data.message : "Unknown error") });
    }
    text = data.body;
  } catch (err) {
    console.error('PDF.co fetch error:', err);
    return res.status(500).json({ error: "API request failed: " + err.message });
  } finally {
    if (tempPath) {
      try { await fs.unlink(tempPath); } catch (_) {}
    }
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
