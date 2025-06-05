const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { Poppler } = require('node-poppler');
const Tesseract = require('tesseract.js');

// Build deposit JSON structure from extracted text
function extractDepositData(text) {
  const template = {
    status: 'success',
    ver: '1.19.0',
    data: [
      {
        linkReferenceNumber: '',
        maskedAccountNumber: '',
        fiType: '',
        bank: '',
        Summary: {
          currentBalance: '',
          currency: '',
          exchgeRate: '',
          balanceDateTime: '',
          type: '',
          branch: '',
          facility: '',
          ifscCode: '',
          micrCode: '',
          openingDate: '',
          currentODLimit: '',
          drawingLimit: '',
          status: '',
          Pending: []
        },
        Profile: {
          Holders: {
            type: '',
            Holder: []
          }
        },
        Transactions: {
          startDate: '',
          endDate: '',
          Transaction: []
        }
      }
    ]
  };

  // basic regex based extraction
  const accMatch = text.match(/Account(?:\s*Number)?\s*[:\-]?\s*(\d{4,})/i);
  if (accMatch) template.data[0].maskedAccountNumber = accMatch[1];

  const ifscMatch = text.match(/IFSC\s*[:\-]?\s*([A-Z]{4}0\d{6})/i);
  if (ifscMatch) template.data[0].Summary.ifscCode = ifscMatch[1];

  const bankMatch = text.match(/Bank\s*[:\-]?\s*([A-Za-z ]+)/i);
  if (bankMatch) template.data[0].bank = bankMatch[1].trim();

  // transactions parsing - very naive, expects lines with date amount balance
  const lines = text.split(/\n+/);
  const txnRegex = /(\d{2}[\/\-]\d{2}[\/\-]\d{4}).*?(\d+(?:,\d{3})*(?:\.\d+)?).*?(\d+(?:,\d{3})*(?:\.\d+)?)/;
  for (const l of lines) {
    const m = l.match(txnRegex);
    if (m) {
      template.data[0].Transactions.Transaction.push({
        type: '',
        mode: '',
        amount: m[2],
        currentBalance: m[3],
        transactionTimestamp: m[1],
        valueDate: '',
        txnId: '',
        narration: l,
        reference: ''
      });
    }
  }

  return template;
}

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());
// ensure uploads directory exists
fs.mkdirSync('uploads', { recursive: true });
const upload = multer({ dest: 'uploads/' });

async function ocrImage(filePath) {
  const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
  return text;
}

async function parsePdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  try {
    const data = await pdfParse(dataBuffer);
    if (data.text && data.text.trim().length > 0) {
      return data.text;
    }
  } catch (e) {
    console.error('pdf-parse failed:', e);
  }

  // If no text, convert pages to images and OCR
  const outputDir = path.join('uploads', 'pages_' + path.basename(filePath));
  fs.mkdirSync(outputDir, { recursive: true });
  const poppler = new Poppler();
  await poppler.pdfToCairo(filePath, path.join(outputDir, 'page'), { pngFile: true });

  let text = '';
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.png'));
  for (const file of files) {
    const p = path.join(outputDir, file);
    text += await ocrImage(p);
  }

  fs.rmSync(outputDir, { recursive: true, force: true });
  return text;
}

app.post('/api/parse', upload.array('files'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const results = [];
  for (const file of req.files) {
    try {
      let text = '';
      if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
        text = await parsePdf(file.path);
      } else {
        text = await ocrImage(file.path);
      }
      const data = extractDepositData(text);
      results.push({ name: file.originalname, data });
    } catch (e) {
      results.push({ name: file.originalname, error: e.message });
    } finally {
      fs.unlinkSync(file.path);
    }
  }

  res.json({ files: results });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
