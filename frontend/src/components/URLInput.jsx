import { useState } from "react";

const BACKEND = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function URLInput({ onSessionReady }) {
  const [urls, setUrls] = useState(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (i, val) => {
    setUrls((prev) => prev.map((u, idx) => (idx === i ? val : u)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const filled = urls.filter((u) => u.trim());
    if (!filled.length) {
      setError("Please enter at least one YouTube URL.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: filled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Extraction failed");
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
            Paste up to 3 YouTube links and let AI teach you the topic from scratch
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {urls.map((url, i) => (
            <div key={i} style={styles.inputRow}>
              <span style={styles.label}>Video {i + 1}</span>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => handleChange(i, e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>
          ))}

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? (
              <span style={styles.loadingRow}>
                <span style={styles.spinner} />
                Extracting transcripts…
              </span>
            ) : (
              "Extract & Start Learning"
            )}
          </button>
        </form>
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
  header: {
    textAlign: "center",
    marginBottom: "32px",
  },
  icon: {
    fontSize: "36px",
    marginBottom: "12px",
    display: "inline-block",
    background: "#e53935",
    borderRadius: "50%",
    width: "60px",
    height: "60px",
    lineHeight: "60px",
    textAlign: "center",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#fff",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#8892b0",
    lineHeight: "1.5",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  inputRow: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#8892b0",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  input: {
    background: "#0f0f1a",
    border: "1px solid #1f3460",
    borderRadius: "8px",
    padding: "12px 14px",
    color: "#e0e0e0",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
  },
  error: {
    color: "#ff6b6b",
    fontSize: "13px",
    background: "rgba(255,107,107,0.1)",
    padding: "10px 14px",
    borderRadius: "8px",
  },
  button: {
    marginTop: "8px",
    padding: "14px",
    background: "#e53935",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  spinner: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
};
