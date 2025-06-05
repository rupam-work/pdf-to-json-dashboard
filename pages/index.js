import React, { useState } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);

  const handleChange = async (e) => {
    setError('');
    setText('');
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
      const combined = data.files
        .map(f => `--- ${f.name} ---\n${JSON.stringify(f.data || f.error, null, 2)}`)
        .join('\n\n');
      setText(combined);
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
      {text && (
        <pre style={{ textAlign: 'left', marginTop: 20, background: '#f6f8fa', padding: 20, borderRadius: 6 }}>
          {text}
        </pre>
      )}
    </div>
  );
}
