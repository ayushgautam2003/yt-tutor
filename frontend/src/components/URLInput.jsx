import { useState } from "react";

const BACKEND = import.meta.env.VITE_API_URL || "http://localhost:8000";

const isIPBlock = (msg) =>
  typeof msg === "string" && msg.toLowerCase().includes("ip");

export default function URLInput({ onSessionReady }) {
  const [urls, setUrls] = useState(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [texts, setTexts] = useState(["", "", ""]);

  const handleUrlChange = (i, val) =>
    setUrls((prev) => prev.map((u, idx) => (idx === i ? val : u)));

  const handleTextChange = (i, val) =>
    setTexts((prev) => prev.map((t, idx) => (idx === i ? val : t)));

  const handleSubmitUrls = async (e) => {
    e.preventDefault();
    setError("");
    const filled = urls.filter((u) => u.trim());
    if (!filled.length) { setError("Please enter at least one YouTube URL."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: filled }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail);
        if (isIPBlock(msg)) { setShowPaste(true); setError(""); return; }
        throw new Error(msg);
      }
      onSessionReady(data.session_id, data.videos_processed, data.errors);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPaste = async (e) => {
    e.preventDefault();
    setError("");
    const filled = texts.filter((t) => t.trim());
    if (!filled.length) { setError("Please paste at least one transcript."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/extract-raw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: filled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to process transcripts");
      onSessionReady(data.session_id, data.videos_processed, data.errors);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.icon}>▶</div>
          <h1 style={styles.title}>YT Tutor</h1>
          <p style={styles.subtitle}>
            {showPaste
              ? "Paste transcript text from YouTube videos below"
              : "Paste up to 3 YouTube links and let AI teach you the topic from scratch"}
          </p>
        </div>

        {!showPaste ? (
          <form onSubmit={handleSubmitUrls} style={styles.form}>
            {urls.map((url, i) => (
              <div key={i} style={styles.inputRow}>
                <span style={styles.label}>Video {i + 1}</span>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => handleUrlChange(i, e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />
              </div>
            ))}
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" style={styles.button} disabled={loading}>
              {loading
                ? <span style={styles.loadingRow}><span style={styles.spinner} />Extracting…</span>
                : "Extract & Start Learning"}
            </button>
            <button type="button" style={styles.altBtn} onClick={() => setShowPaste(true)}>
              Paste transcript text instead
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitPaste} style={styles.form}>
            <div style={styles.hint}>
              On YouTube: open the video → click <strong>⋯</strong> below the title → <strong>Open transcript</strong> → select all text and copy.
            </div>
            {texts.map((text, i) => (
              <div key={i} style={styles.inputRow}>
                <span style={styles.label}>Transcript {i + 1}</span>
                <textarea
                  placeholder="Paste transcript text here…"
                  value={text}
                  onChange={(e) => handleTextChange(i, e.target.value)}
                  style={styles.textarea}
                  rows={4}
                  disabled={loading}
                />
              </div>
            ))}
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" style={styles.button} disabled={loading}>
              {loading
                ? <span style={styles.loadingRow}><span style={styles.spinner} />Processing…</span>
                : "Build Knowledge Base & Start"}
            </button>
            <button type="button" style={styles.altBtn} onClick={() => { setShowPaste(false); setError(""); }}>
              ← Back to URL input
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)",
  },
  card: {
    background: "#16213e",
    borderRadius: "16px",
    padding: "40px",
    width: "100%",
    maxWidth: "560px",
    border: "1px solid #1f3460",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  header: { textAlign: "center", marginBottom: "32px" },
  icon: {
    fontSize: "36px", marginBottom: "12px",
    display: "inline-block", background: "#e53935",
    borderRadius: "50%", width: "60px", height: "60px",
    lineHeight: "60px", textAlign: "center",
  },
  title: { fontSize: "28px", fontWeight: "700", color: "#fff", marginBottom: "8px" },
  subtitle: { fontSize: "14px", color: "#8892b0", lineHeight: "1.5" },
  form: { display: "flex", flexDirection: "column", gap: "14px" },
  inputRow: { display: "flex", flexDirection: "column", gap: "6px" },
  label: {
    fontSize: "12px", fontWeight: "600", color: "#8892b0",
    textTransform: "uppercase", letterSpacing: "0.05em",
  },
  input: {
    background: "#0f0f1a", border: "1px solid #1f3460",
    borderRadius: "8px", padding: "12px 14px",
    color: "#e0e0e0", fontSize: "14px", outline: "none",
  },
  textarea: {
    background: "#0f0f1a", border: "1px solid #1f3460",
    borderRadius: "8px", padding: "12px 14px",
    color: "#e0e0e0", fontSize: "13px", outline: "none",
    resize: "vertical", fontFamily: "inherit", lineHeight: "1.5",
  },
  hint: {
    fontSize: "13px", color: "#8892b0", lineHeight: "1.6",
    background: "rgba(100,255,218,0.05)", border: "1px solid #1f3460",
    borderRadius: "8px", padding: "12px 14px",
  },
  error: {
    color: "#ff6b6b", fontSize: "13px",
    background: "rgba(255,107,107,0.1)",
    padding: "10px 14px", borderRadius: "8px",
  },
  button: {
    marginTop: "8px", padding: "14px",
    background: "#e53935", color: "#fff",
    border: "none", borderRadius: "8px",
    fontSize: "15px", fontWeight: "600", cursor: "pointer",
  },
  altBtn: {
    padding: "10px", background: "transparent",
    border: "1px solid #1f3460", borderRadius: "8px",
    color: "#8892b0", fontSize: "13px", cursor: "pointer",
  },
  loadingRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  spinner: {
    display: "inline-block", width: "14px", height: "14px",
    border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
    borderRadius: "50%", animation: "spin 0.7s linear infinite",
  },
};
