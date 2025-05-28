import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const ReactJson = dynamic(() => import('react-json-view'), { ssr: false });

export default function Home() {
  const [json, setJson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  async function handleFileChange(e) {
    const file = e.target.files[0];
    setFileName(file?.name || '');
    if (!file) return;
    setLoading(true);
    setError('');
    setJson(null);

    const formData = new FormData();
    formData.append('pdf', file);

    const res = await fetch('/api/parse', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      setError('Failed to parse PDF');
      setLoading(false);
      return;
    }
    const data = await res.json();
    setJson(data);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 800, margin: 'auto', padding: 40 }}>
      <h1>PDF to JSON Dashboard</h1>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      {fileName && <div style={{ marginTop: 8 }}>Selected: <b>{fileName}</b></div>}
      {loading && <div>Parsing PDF, please wait...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {json && (
        <div style={{ marginTop: 32 }}>
          <h2>Resulting JSON</h2>
          <ReactJson src={json} collapsed={false} displayDataTypes={false} />
        </div>
      )}
    </div>
  );
}