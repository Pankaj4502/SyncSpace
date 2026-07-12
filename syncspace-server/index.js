const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomID) => {
    socket.join(roomID);
    console.log(`User ${socket.id} joined room: ${roomID}`);
  });

  socket.on('send-changes', (updateData, roomID) => {
    socket.to(roomID).emit('receive-changes', updateData);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  socket.on('send-awareness', (updateData, roomID) => {
    socket.to(roomID).emit('receive-awareness', updateData);
  });
});

server.listen(3001, () => {
  console.log('SyncSpace server running on port 3001');
});