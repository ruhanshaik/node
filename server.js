const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Use process.cwd() to find files on the Railway server
const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));

let waitingUser = null;

// The "Catch-all" route: If a user hits any URL, show index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('find-match', () => {
        // If someone is waiting and it's not the same person
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

    socket.on('disconnect', () => {
        if (waitingUser && waitingUser.id === socket.id) {
            waitingUser = null;
        }
    });
});

// Railway needs 0.0.0.0 to listen to external traffic
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`BangaloreConnect is LIVE on port ${PORT}`);
});
