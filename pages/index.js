import React, { useState } from 'react';

export default function Home() {
  const [json, setJson] = useState(null);
  const [error, setError] = useState('');
  const [filename, setFilename] = useState('');

  const handleFileChange = async (e) => {
    setError('');
    setJson(null);
    const file = e.target.files[0];
    if (!file) return;
    setFilename(file.name);

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Failed to parse PDF.');
      const data = await res.json();
      setJson(data);
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
    a.download = (filename || 'parsed') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ margin: "40px auto", maxWidth: 700 }}>
      <h1>PDF to JSON Dashboard</h1>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      {filename && <span style={{ marginLeft: 10 }}>{filename}</span>}
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
          <pre style={{ textAlign: "left", background: "#f6f8fa", padding: 20, borderRadius: 6, fontSize: 16, maxHeight: 400, overflow: 'auto' }}>
            {JSON.stringify(json, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
