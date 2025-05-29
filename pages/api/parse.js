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
    const form = new formidable.IncomingForm();
    const files = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve(files);
      });
    });

    const pdfFile = files.pdf;
    if (!pdfFile) return res.status(400).json({ error: "No PDF uploaded" });
    fileBuffer = await fs.readFile(pdfFile.filepath);
  } catch (e) {
    return res.status(400).json({ error: "File upload failed" });
  }

  let text;
  try {
    const pdfResponse = await fetch("https://api.pdf.co/v1/pdf/c
