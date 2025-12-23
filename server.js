const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(process.cwd())));

let waitingUser = null;
let onlineCount = 0; // Track online users

app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

io.on('connection', (socket) => {
    // Increase count and broadcast to everyone
    onlineCount++;
    io.emit('user-count', onlineCount);
    console.log('User connected. Total:', onlineCount);

    socket.on('find-match', (userData) => {
        socket.userData = userData;
        if (waitingUser && waitingUser.id !== socket.id) {
            const partner = waitingUser;
            const roomId = `room-${socket.id}-${partner.id}`;
            socket.join(roomId);
            partner.join(roomId);
            socket.currentRoom = roomId;
            partner.currentRoom = roomId;
            socket.emit('match-found', partner.userData);
            partner.emit('match-found', socket.userData);
            waitingUser = null;
        } else {
            waitingUser = socket;
        }
    });

    socket.on('send-message', (msg) => {
        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('receive-message', msg);
        }
    });

    socket.on('disconnect', () => {
        // Decrease count and broadcast
        onlineCount = Math.max(0, onlineCount - 1);
        io.emit('user-count', onlineCount);
        if (waitingUser && waitingUser.id === socket.id) waitingUser = null;
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Indian Omegle is LIVE on port ${PORT}`);
});
