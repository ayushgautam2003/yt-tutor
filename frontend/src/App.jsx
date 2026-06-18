import { useState } from "react";
import URLInput from "./components/URLInput";
import Chat from "./components/Chat";

export default function App() {
  const [session, setSession] = useState(null);

  const handleSessionReady = (sessionId, videosProcessed, errors) => {
    setSession({ sessionId, videosProcessed, errors });
  };

  const handleReset = () => {
    setSession(null);
  };

  if (session) {
    return (
      <Chat
        sessionId={session.sessionId}
        videosProcessed={session.videosProcessed}
        errors={session.errors}
        onReset={handleReset}
      />
    );
  }

  return <URLInput onSessionReady={handleSessionReady} />;
}
