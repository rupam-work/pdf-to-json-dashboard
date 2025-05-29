import React, { useState } from "react";

export default function Home() {
  const [json, setJson] = useState(null);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e) => {
    setError("");
    setJson(null);
    const file = e.target.files[0];
    if (!file) return;
    setFilename(file.name);
    setLoading(true);

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        setJson(data.mapped);
      } else {
        setError(data.error || "Error parsing PDF");
      }
    } catch (err) {
      setLoading(false);
      setError("Failed to parse PDF: " + err.message);
    }
  };

  return (
    <div style={{ margin: "40px auto", maxWidth: 700 }}>
      <h1>PDF to JSON Dashboard</h1>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      {filename && <span style={{ marginLeft: 8 }}>{filename}</span>}
      {loading && <p>Parsing PDF…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {json && (
        <pre
          style={{
            textAlign: "left",
            marginTop: 20,
            background: "#f6f8fa",
            padding: 20,
            borderRadius: 6,
            fontSize: 16,
          }}
        >
          {JSON.stringify(json, null, 2)}
        </pre>
      )}
    </div>
  );
}
