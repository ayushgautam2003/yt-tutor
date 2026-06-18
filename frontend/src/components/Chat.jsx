import { useState, useRef, useEffect } from "react";

const BACKEND = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Chat({ sessionId, videosProcessed, errors, onReset }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `I've processed ${videosProcessed} video${videosProcessed > 1 ? "s" : ""} and built your knowledge base. I'm ready to teach you this topic from the very beginning — step by step.\n\nWhere would you like to start? You can say **"teach me from the beginning"** or ask any specific question.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    const assistantMsg = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch(`${BACKEND}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          messages: updatedMessages,
        }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          if (payload.startsWith("[ERROR]")) {
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { role: "assistant", content: payload };
              return copy;
            });
            break;
          }
          const token = payload.replace(/\\n/g, "\n");
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              role: "assistant",
              content: copy[copy.length - 1].content + token,
            };
            return copy;
          });
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>▶</span>
          <span style={styles.logoText}>YT Tutor</span>
        </div>
        <div style={styles.sessionInfo}>
          <p style={styles.sessionLabel}>Knowledge Base</p>
          <p style={styles.sessionStat}>{videosProcessed} video{videosProcessed > 1 ? "s" : ""} processed</p>
          {errors.length > 0 && (
            <p style={styles.sessionError}>{errors.length} video{errors.length > 1 ? "s" : ""} failed</p>
          )}
        </div>
        <button style={styles.resetBtn} onClick={onReset}>
          + New Session
        </button>
      </div>

      <div style={styles.main}>
        <div style={styles.messages}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                ...styles.msgRow,
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {msg.role === "assistant" && (
                <div style={styles.avatar}>AI</div>
              )}
              <div
                style={{
                  ...styles.bubble,
                  ...(msg.role === "user" ? styles.userBubble : styles.aiBubble),
                }}
              >
                <MessageContent content={msg.content} />
                {i === messages.length - 1 && loading && msg.role === "assistant" && msg.content === "" && (
                  <span style={styles.cursor} />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div style={styles.inputArea}>
          <textarea
            ref={textareaRef}
            style={styles.textarea}
            placeholder="Ask a question or say 'teach me from the beginning'…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button
            style={{
              ...styles.sendBtn,
              opacity: loading || !input.trim() ? 0.5 : 1,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            }}
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            {loading ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageContent({ content }) {
  if (!content) return <span style={styles.cursor} />;
  return (
    <span style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
      {content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          part
        )
      )}
    </span>
  );
}

const styles = {
  page: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
    background: "#0f0f1a",
  },
  sidebar: {
    width: "220px",
    flexShrink: 0,
    background: "#16213e",
    borderRight: "1px solid #1f3460",
    display: "flex",
    flexDirection: "column",
    padding: "24px 16px",
    gap: "24px",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoIcon: {
    background: "#e53935",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
  },
  logoText: {
    fontWeight: "700",
    fontSize: "18px",
    color: "#fff",
  },
  sessionInfo: {
    background: "#0f0f1a",
    borderRadius: "10px",
    padding: "14px",
    border: "1px solid #1f3460",
  },
  sessionLabel: {
    fontSize: "11px",
    color: "#8892b0",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "6px",
  },
  sessionStat: {
    fontSize: "13px",
    color: "#64ffda",
    fontWeight: "600",
  },
  sessionError: {
    fontSize: "12px",
    color: "#ff6b6b",
    marginTop: "4px",
  },
  resetBtn: {
    background: "transparent",
    border: "1px solid #1f3460",
    borderRadius: "8px",
    color: "#8892b0",
    padding: "10px",
    fontSize: "13px",
    cursor: "pointer",
    marginTop: "auto",
    transition: "all 0.2s",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  msgRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "#1f3460",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "700",
    color: "#64ffda",
    flexShrink: 0,
    marginTop: "2px",
  },
  bubble: {
    maxWidth: "70%",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  aiBubble: {
    background: "#16213e",
    color: "#e0e0e0",
    border: "1px solid #1f3460",
    borderTopLeftRadius: "2px",
  },
  userBubble: {
    background: "#e53935",
    color: "#fff",
    borderTopRightRadius: "2px",
  },
  cursor: {
    display: "inline-block",
    width: "8px",
    height: "14px",
    background: "#64ffda",
    marginLeft: "2px",
    verticalAlign: "middle",
    animation: "blink 1s step-end infinite",
  },
  inputArea: {
    display: "flex",
    gap: "10px",
    padding: "16px 24px",
    borderTop: "1px solid #1f3460",
    background: "#16213e",
    alignItems: "flex-end",
  },
  textarea: {
    flex: 1,
    background: "#0f0f1a",
    border: "1px solid #1f3460",
    borderRadius: "10px",
    padding: "12px 14px",
    color: "#e0e0e0",
    fontSize: "14px",
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: "1.5",
    maxHeight: "120px",
    overflowY: "auto",
  },
  sendBtn: {
    background: "#e53935",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 20px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    flexShrink: 0,
    height: "44px",
  },
};
