Real-Time Chat Application

A full-stack real-time chat application built with the MERN stack (MongoDB, Express.js, React.js, Node.js) that enables multiple users to communicate in a shared chatroom with persistent message storage.

Features:
Real-time messaging using WebSockets
Multi-user support with concurrent connections
Persistent message storage in MongoDB
Chat history retrieval (last 50 messages)
Username-based messaging
Responsive React frontend
Graceful connection handling

Architecture Overview

Backend Architecture:
The backend is built with Node.js and Express.js, utilizing the ws module for WebSocket connections to enable real-time communication.

Frontend Architecture:
The frontend is a single-page React application that communicates with the backend via WebSocket API.

Database Schema:
MongoDB collection stores chat messages with the following structure:

{
    username: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}


Instructions on how to set up and run the application locally (both backend and frontend):

Backend :
1. cd backend
2. npm install
3. Create .env file with MongoDB connection string
4. npm start

Frontend :
1. cd frontend
2. npm install
3. npm start