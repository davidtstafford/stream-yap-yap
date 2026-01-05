import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './styles/App.css';

// Page components (we'll create these)
import Connection from './pages/Connection';
import Chat from './pages/Chat';
import ChatHistory from './pages/ChatHistory';
import Viewers from './pages/Viewers';
import TTS from './pages/TTS';
import Commands from './pages/Commands';
import DiscordBot from './pages/DiscordBot';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <nav className="sidebar">
          <h1 className="app-title">Stream Yap Yap</h1>
          <ul className="nav-menu">
            <li><Link to="/">📡 Connection</Link></li>
            <li><Link to="/chat">💬 Chat</Link></li>
            <li><Link to="/chat-history">📜 Chat History</Link></li>
            <li><Link to="/viewers">👥 Viewers</Link></li>
            <li><Link to="/tts">🔊 TTS</Link></li>
            <li><Link to="/commands">⚡ Chat Commands</Link></li>
            <li><Link to="/discord">🎮 Discord Bot</Link></li>
          </ul>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Connection />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat-history" element={<ChatHistory />} />
            <Route path="/viewers" element={<Viewers />} />
            <Route path="/tts" element={<TTS />} />
            <Route path="/commands" element={<Commands />} />
            <Route path="/discord" element={<DiscordBot />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
