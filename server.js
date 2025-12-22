const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // Allows connections from your Railway URL
});

app.use(express.static(path.join(__dirname, 'public')));

let waitingUser = null; 

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('find-match', () => {
        if (waitingUser && waitingUser.id !== socket.id) {
            // MATCH LOGIC: Connect this user with the waiting user
            const partner = waitingUser;
            const roomId = `room-${socket.id}-${partner.id}`;

            socket.join(roomId);
            partner.join(roomId);

            socket.currentRoom = roomId;
            partner.currentRoom = roomId;

            io.to(roomId).emit('match-found', { message: "You are now matched!" });
            waitingUser = null; 
        } else {
            waitingUser = socket;
            socket.emit('waiting', { message: "Searching for a partner..." });
        }
    });

    socket.on('send-message', (msg) => {
        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('receive-message', msg);
        }
    });

    socket.on('disconnect', () => {
        if (waitingUser && waitingUser.id === socket.id) waitingUser = null;
    });
});

// CRITICAL FOR HOSTING: Use process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});