import React, { useState } from 'react';

export default function Home() {
  const [json, setJson] = useState(null);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileChange = async (e) => {
    setError('');
    setJson(null);
    const file = e.target.files[0];
    setFileName(file ? file.name : '');
    if (!file) return;

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch('/api/parse', { method: 'POST', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unknown error');
      setJson(result);
    } catch (err) {
      setError('Failed to parse PDF: ' + err.message);
    }
  };

  const handleDownload = () => {
    if (!json) return;
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
      {fileName && <span style={{ marginLeft: 8 }}>Selected: <b>{fileName}</b></span>}
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
          <pre style={{ textAlign: "left", marginTop: 20, background: "#f6f8fa", padding: 20, borderRadius: 6 }}>
            {JSON.stringify(json, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
