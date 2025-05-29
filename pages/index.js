import React, { useState } from 'react';
import { pdfjs } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Setup the worker source for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function Home() {
  const [json, setJson] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    setError('');
    setJson(null);
    const file = e.target.files[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let textContent = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const txt = await page.getTextContent();
        textContent += txt.items.map(item => item.str).join(' ') + '\n';
      }

      // Use your own mapping logic here
      const jsonResult = detectFITypeAndMapToJSON(textContent);
      setJson(jsonResult);

    } catch (err) {
      setError('Failed to parse PDF: ' + err.message);
    }
  };

  // TODO: Replace with your real mapping logic!
  function detectFITypeAndMapToJSON(rawText) {
    // DEMO: You MUST replace with your AA schema logic!
    if (rawText.includes('Mutual Fund')) {
      return { type: "MUTUAL_FUND", extractedText: rawText };
    }
    if (rawText.includes('Equity')) {
      return { type: "EQUITY", extractedText: rawText };
    }
    if (rawText.includes('ETF')) {
      return { type: "ETF", extractedText: rawText };
    }
    return { type: "DEPOSIT", extractedText: rawText };
  }

  return (
    <div style={{ margin: "40px auto", maxWidth: 700 }}>
      <h1>PDF to JSON Dashboard</h1>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {json && (
        <pre style={{ textAlign: "left", marginTop: 20, background: "#f6f8fa", padding: 20, borderRadius: 6 }}>
          {JSON.stringify(json, null, 2)}
        </pre>
      )}
    </div>
  );
}
