import { useState, useEffect } from "react";

const BACKEND = import.meta.env.VITE_API_URL || "http://localhost:8000";

const MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"];
const LEVELS = ["beginner", "intermediate", "advanced"];
const STYLES = ["concise", "detailed"];

export default function SettingsPanel({ onClose }) {
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND}/settings`)
      .then((r) => r.json())
      .then(setCfg);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`${BACKEND}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const set = (key, val) => setCfg((prev) => ({ ...prev, [key]: val }));

  if (!cfg) return <div style={styles.overlay}><div style={styles.panel}><p style={{ color: "#8892b0" }}>Loading…</p></div></div>;

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.sections}>

          {/* Model */}
          <Section label="Model">
            <SelectRow label="Model" value={cfg.model_name} options={MODELS} onChange={(v) => set("model_name", v)} />
          </Section>

          {/* Fine-tuning */}
          <Section label="Fine-Tuning">
            <SliderRow label="Temperature" value={cfg.temperature} min={0} max={2} step={0.05}
              hint="Lower = more focused, Higher = more creative"
              onChange={(v) => set("temperature", v)} />
            <SliderRow label="Max Tokens" value={cfg.max_tokens} min={50} max={4000} step={50}
              hint="Maximum length of the AI response"
              onChange={(v) => set("max_tokens", v)} />
            <SliderRow label="Top-P" value={cfg.top_p} min={0} max={1} step={0.05}
              hint="Nucleus sampling — 1.0 = all tokens considered"
              onChange={(v) => set("top_p", v)} />
            <SliderRow label="Frequency Penalty" value={cfg.frequency_penalty} min={-2} max={2} step={0.1}
              hint="Penalises repeated words"
              onChange={(v) => set("frequency_penalty", v)} />
            <SliderRow label="Presence Penalty" value={cfg.presence_penalty} min={-2} max={2} step={0.1}
              hint="Encourages talking about new topics"
              onChange={(v) => set("presence_penalty", v)} />
          </Section>

          {/* Retrieval */}
          <Section label="Retrieval (RAG)">
            <SliderRow label="Chunks retrieved (K)" value={cfg.retrieval_k} min={1} max={20} step={1}
              hint="How many chunks from Pinecone to include as context"
              onChange={(v) => set("retrieval_k", v)} />
          </Section>

          {/* Teaching */}
          <Section label="Teaching Behaviour">
            <SelectRow label="Teaching Level" value={cfg.teaching_level} options={LEVELS} onChange={(v) => set("teaching_level", v)} />
            <SelectRow label="Response Style" value={cfg.response_style} options={STYLES} onChange={(v) => set("response_style", v)} />
          </Section>
        </div>

        <button style={{ ...styles.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={styles.section}>
      <p style={styles.sectionLabel}>{label}</p>
      {children}
    </div>
  );
}

function SliderRow({ label, value, min, max, step, hint, onChange }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowHeader}>
        <span style={styles.rowLabel}>{label}</span>
        <span style={styles.rowValue}>{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={styles.slider} />
      <p style={styles.hint}>{hint}</p>
    </div>
  );
}

function SelectRow({ label, value, options, onChange }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={styles.select}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex", justifyContent: "flex-end",
    zIndex: 100,
  },
  panel: {
    width: "360px", height: "100vh",
    background: "#16213e",
    borderLeft: "1px solid #1f3460",
    display: "flex", flexDirection: "column",
    overflowY: "auto",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 20px 12px",
    borderBottom: "1px solid #1f3460",
  },
  title: { fontSize: "16px", fontWeight: "700", color: "#fff" },
  closeBtn: {
    background: "none", border: "none", color: "#8892b0",
    fontSize: "16px", cursor: "pointer",
  },
  sections: { flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: "20px" },
  section: { display: "flex", flexDirection: "column", gap: "12px" },
  sectionLabel: {
    fontSize: "11px", fontWeight: "700", color: "#64ffda",
    textTransform: "uppercase", letterSpacing: "0.08em",
    marginBottom: "2px",
  },
  row: { display: "flex", flexDirection: "column", gap: "4px" },
  rowHeader: { display: "flex", justifyContent: "space-between" },
  rowLabel: { fontSize: "13px", color: "#ccd6f6" },
  rowValue: { fontSize: "13px", color: "#64ffda", fontWeight: "600" },
  slider: { width: "100%", accentColor: "#e53935" },
  hint: { fontSize: "11px", color: "#8892b0" },
  select: {
    background: "#0f0f1a", border: "1px solid #1f3460",
    borderRadius: "6px", color: "#e0e0e0",
    padding: "8px 10px", fontSize: "13px", cursor: "pointer",
  },
  saveBtn: {
    margin: "0 20px 20px",
    padding: "12px",
    background: "#e53935", color: "#fff",
    border: "none", borderRadius: "8px",
    fontSize: "14px", fontWeight: "600", cursor: "pointer",
  },
};
