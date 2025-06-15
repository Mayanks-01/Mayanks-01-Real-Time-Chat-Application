import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// IMPORTANT: Replace with your actual Render backend URL
const WEBSOCKET_URL = process.env.NODE_ENV === 'production' 
  ? 'wss://real-time-chat-application-39bm.onrender.com' // Replace xxxx with your actual Render URL
  : 'ws://localhost:5000';



function App() {
  // State management
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // WebSocket reference
  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const pendingUsername = useRef(null); // Store username until connection is ready

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect to WebSocket server
  const connectWebSocket = (usernameToJoin) => {
    setIsConnecting(true);
    pendingUsername.current = usernameToJoin;
    
    ws.current = new WebSocket(WEBSOCKET_URL);
    
    ws.current.onopen = () => {
      
      setIsConnected(true);
      setIsConnecting(false);
      
      // Now send the join message
      if (pendingUsername.current) {
       
        ws.current.send(JSON.stringify({
          type: 'join',
          username: pendingUsername.current
        }));
        setIsJoined(true);
        pendingUsername.current = null;
      }
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      
      if (data.type === 'history') {
        // Load chat history
        setMessages(data.messages.map(msg => ({
          type: 'message',
          username: msg.username,
          message: msg.message,
          timestamp: new Date(msg.timestamp)
        })));
      } else if (data.type === 'message') {
        // New chat message
        setMessages(prev => [...prev, {
          type: 'message',
          username: data.username,
          message: data.message,
          timestamp: new Date(data.timestamp)
        }]);
      } else if (data.type === 'system') {
        // System notification
        setMessages(prev => [...prev, {
          type: 'system',
          message: data.message,
          timestamp: new Date(data.timestamp)
        }]);
      } else if (data.type === 'error') {
        // Error message
        console.error('Server error:', data.message);
        alert(`Error: ${data.message}`);
        setIsConnecting(false);
        setIsJoined(false);
      }
    };

    ws.current.onclose = (event) => {
     
      setIsConnected(false);
      setIsConnecting(false);
      if (isJoined) {
        alert('Connection lost. Please rejoin the chat.');
        setIsJoined(false);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      setIsConnecting(false);
      if (!isJoined) {
        alert('Failed to connect to chat server. Please check your connection and try again.');
      }
    };
  };

  // Join chat room
  const joinChat = (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }

    if (isConnecting) {
      return; // Prevent multiple connection attempts
    }

   
    connectWebSocket(username.trim());
  };

  // Send message
  const sendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.current.send(JSON.stringify({
      type: 'message',
      message: newMessage.trim()
    }));

    setNewMessage('');
  };

  // Leave chat
  const leaveChat = () => {
    if (ws.current) {
      ws.current.close();
    }
    setIsJoined(false);
    setIsConnected(false);
    setIsConnecting(false);
    setMessages([]);
    setUsername('');
    pendingUsername.current = null;
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render join form
  if (!isJoined) {
    return (
      <div className="app">
        <div className="join-container">
          <h1>💬 Real-Time Chat</h1>
          <form onSubmit={joinChat} className="join-form">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="username-input"
              maxLength={20}
              disabled={isConnecting}
            />
            <button 
              type="submit" 
              className="join-button"
              disabled={isConnecting || !username.trim()}
            >
              {isConnecting ? 'Connecting...' : 'Join Chat'}
            </button>
          </form>
          {isConnecting && (
            <p style={{ color: '#666', marginTop: '10px' }}>
              Connecting to chat server...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Render chat interface
  return (
    <div className="app">
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <h2>💬 Chat Room</h2>
          <div className="header-info">
            <span className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
            <span className="username">👤 {username}</span>
            <button onClick={leaveChat} className="leave-button">Leave</button>
          </div>
        </div>

        {/* Messages */}
        <div className="messages-container">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`message ${msg.type === 'system' ? 'system-message' : 'chat-message'}`}
            >
              {msg.type === 'system' ? (
                <div className="system-text">
                  <span className="timestamp">{formatTime(msg.timestamp)}</span>
                  {msg.message}
                </div>
              ) : (
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-username">{msg.username}</span>
                    <span className="timestamp">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="message-text">{msg.message}</div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <form onSubmit={sendMessage} className="message-form">
          <input
            type="text"
            placeholder={isConnected ? "Type your message..." : "Reconnecting..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="message-input"
            disabled={!isConnected}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={!isConnected || !newMessage.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
