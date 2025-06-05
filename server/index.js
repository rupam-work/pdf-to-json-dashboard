const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { Poppler } = require('node-poppler');
const Tesseract = require('tesseract.js');

const app = express();
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

app.post('/api/upload', upload.array('files'), async (req, res) => {
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
      results.push({ name: file.originalname, text });
    } catch (e) {
      results.push({ name: file.originalname, error: e.message });
    } finally {
      fs.unlinkSync(file.path);
    }
  }

  res.json({ files: results });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
