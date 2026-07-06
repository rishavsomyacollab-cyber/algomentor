import { useState } from "react";
import TopicMap from "./components/TopicMap";
import TopicView from "./components/TopicView";
import ChatBot from "./components/ChatBot";

export default function App() {
  const [selectedTopic, setSelectedTopic] = useState(null);

  return (
    <div style={{ minHeight: "100vh" }}>
      <header className="app-header">
        <span className="logo">AlgoMentor</span>
        <span className="tagline">DSA Tutor powered by Claude</span>
        {selectedTopic && (
          <button className="back-btn" onClick={() => setSelectedTopic(null)}>
            ← All Topics
          </button>
        )}
      </header>

      <main className="app-main">
        {selectedTopic ? (
          <TopicView topic={selectedTopic} onTopicSelect={setSelectedTopic} />
        ) : (
          <TopicMap onSelect={setSelectedTopic} />
        )}
      </main>
      <ChatBot currentTopic={selectedTopic} />
    </div>
  );
}
