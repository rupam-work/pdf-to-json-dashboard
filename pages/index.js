import React, { useState } from 'react';
import { pdfjs } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import JSONPretty from 'react-json-pretty';
import 'react-json-pretty/themes/monikai.css';

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

      const jsonResult = detectFITypeAndMapToJSON(textContent);
      setJson(jsonResult);

    } catch (err) {
      setError('Failed to parse PDF: ' + err.message);
    }
  };

  function detectFITypeAndMapToJSON(rawText) {
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

  // Download JSON handler
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parsed.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ margin: "40px auto", maxWidth: 700 }}>
      <h1>PDF to JSON Dashboard</h1>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {json && (
        <>
          <div style={{ margin: "20px 0" }}>
            <button onClick={handleDownload} style={{
              background: "#1976d2", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 4, cursor: "pointer"
            }}>
              Download JSON
            </button>
          </div>
          <JSONPretty data={json} style={{ fontSize: 16 }} />
        </>
      )}
    </div>
  );
}
