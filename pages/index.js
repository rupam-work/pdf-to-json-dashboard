import React, { useState } from 'react';

export default function Home() {
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);

  const handleChange = async (e) => {
    setError('');
    setResults([]);
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${baseUrl}/api/parse`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setResults(data.files);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ margin: '40px auto', maxWidth: 700 }}>
      <h1>PDF/Image Text Extractor</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" multiple accept="application/pdf,image/*" onChange={handleChange} />
        <button type="submit" style={{ marginLeft: 10 }}>Upload</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {results.map(r => (
        <div key={r.name} style={{ marginTop: 20, textAlign: 'left' }}>
          <h3>{r.name}</h3>
          {r.error ? (
            <p style={{ color: 'red' }}>{r.error}</p>
          ) : (
            <pre style={{ background: '#f6f8fa', padding: 20, borderRadius: 6 }}>
              {JSON.stringify(r.data, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
