require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const mongoose = require('mongoose');

// Import Message model
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// CORS configuration for production
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://realchat-application.netlify.app/'] 
    : ['http://localhost:3000'],
  credentials: true
}));

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients with their usernames
const clients = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error(' MongoDB connection error:', err));

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Chat server is running!' });
});

// API route to get recent messages
app.get('/api/messages', async (req, res) => {
    try {
        const messages = await Message.find()
            .sort({ timestamp: -1 })
            .limit(50);
        res.json(messages.reverse()); // Reverse to show oldest first
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// WebSocket connection handling
wss.on('connection', (ws) => {
   

    // Handle incoming messages from clients
    ws.on('message', async (data) => {
        try {
            const messageData = JSON.parse(data);
           

            // Handle different message types
            if (messageData.type === 'join') {
                // Client is joining with username
                clients.set(ws, messageData.username);
           
                
                // Send recent chat history to the new client
                const recentMessages = await Message.find()
                    .sort({ timestamp: -1 })
                    .limit(50);
                
                ws.send(JSON.stringify({
                    type: 'history',
                    messages: recentMessages.reverse()
                }));

                // Notify other clients that someone joined
                broadcastToOthers(ws, {
                    type: 'system',
                    message: `${messageData.username} joined the chat`,
                    timestamp: new Date()
                });

            } else if (messageData.type === 'message') {
                // Regular chat message
                const username = clients.get(ws);
                
                if (!username) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Please join with a username first'
                    }));
                    return;
                }

                // Save message to database
                const newMessage = new Message({
                    username: username,
                    message: messageData.message
                });
                
                await newMessage.save();

                // Broadcast message to all connected clients
                const messageToSend = {
                    type: 'message',
                    username: username,
                    message: messageData.message,
                    timestamp: newMessage.timestamp
                };

                broadcastToAll(messageToSend);
            }

        } catch (error) {
            console.error('❌ Error handling message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        const username = clients.get(ws);
        if (username) {
            
            // Notify other clients
            broadcastToOthers(ws, {
                type: 'system',
                message: `${username} left the chat`,
                timestamp: new Date()
            });
        }
        clients.delete(ws);
    });

    // Handle connection errors
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
});

// Helper function to broadcast message to all connected clients
function broadcastToAll(message) {
    const messageString = JSON.stringify(message);
    
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageString);
        }
    });
}

// Helper function to broadcast message to all clients except sender
function broadcastToOthers(sender, message) {
    const messageString = JSON.stringify(message);
    
    wss.clients.forEach((client) => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(messageString);
        }
    });
}

// Start server
server.listen(PORT);
