const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// This ensures the server finds the 'public' folder even if it's in a subfolder
const publicPath = path.resolve(__dirname, 'public');
app.use(express.static(publicPath));

let waitingUser = null;

// The "Catch-all" fix: This forces the server to send index.html for the main link
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

io.on('connection', (socket) => {
    socket.on('find-match', () => {
        if (waitingUser && waitingUser.id !== socket.id) {
            const partner = waitingUser;
            const roomId = `room-${socket.id}-${partner.id}`;
            socket.join(roomId);
            partner.join(roomId);
            socket.currentRoom = roomId;
            partner.currentRoom = roomId;
            io.to(roomId).emit('match-found');
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
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`BangaloreConnect is LIVE on port ${PORT}`);
});
