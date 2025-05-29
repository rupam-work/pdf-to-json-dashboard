import formidable from 'formidable';
import pdfParse from 'pdf-parse';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err || !files.pdf) {
      res.status(400).json({ error: "PDF upload failed" });
      return;
    }
    try {
      let buffer;
      // Vercel may use 'buffer' property, not path!
      if (files.pdf.filepath) {
        // Use fs if path exists
        const fs = await import('fs');
        buffer = fs.readFileSync(files.pdf.filepath);
      } else if (files.pdf._writeStream && files.pdf._writeStream.buffer) {
        // Edge case, some versions put buffer here
        buffer = files.pdf._writeStream.buffer;
      } else if (files.pdf.buffer) {
        buffer = files.pdf.buffer;
      } else if (files.pdf instanceof Buffer) {
        buffer = files.pdf;
      } else {
        res.status(400).json({ error: "Unable to get PDF buffer" });
        return;
      }

      const data = await pdfParse(buffer);
      const text = data.text || '';
      // Your schema logic
      const type = /mutual fund/i.test(text)
        ? "MUTUAL_FUND"
        : /equity/i.test(text)
        ? "EQUITY"
        : /etf/i.test(text)
        ? "ETF"
        : "DEPOSIT";
      res.status(200).json({ type, extractedText: text });

    } catch (e) {
      res.status(400).json({ error: "Failed to parse PDF: " + e.message });
    }
  });
}
