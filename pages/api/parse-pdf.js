import formidable from 'formidable';
import fs from 'fs/promises';
import BankStatementParser from '../../lib/bankStatementParser';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the PDF file
    const pdfBuffer = await fs.readFile(file.filepath);
    
    // Parse the PDF
    const parser = new BankStatementParser();
    const result = await parser.parsePDF(pdfBuffer);

    // Clean up uploaded file
    await fs.unlink(file.filepath);

    // Return the parsed JSON
    res.status(200).json(result);
  } catch (error) {
    console.error('Error parsing PDF:', error);
    res.status(500).json({ 
      ver: "1.21.0",
      status: "error",
      data: [],
      error: error.message || 'Failed to parse PDF'
    });
  }
}
