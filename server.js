const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Use CORS to allow your Railway domain to talk to your backend
const io = new Server(server, {
    cors: {
        origin: "*", // Allows any domain to connect
        methods: ["GET", "POST"]
    }
});

// Serve static files from the 'public' folder
const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));

let waitingUser = null;

// The "Catch-all" route: If your friend visits any page, send them to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('find-match', () => {
        // Matching logic
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
            socket.emit('searching', { message: "Looking for someone..." });
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
        console.log('User disconnected:', socket.id);
    });
});

// RAILWAY CONFIGURATION
// Use the port Railway gives us, or default to 3000 for local testing
const PORT = process.env.PORT || 3000;

// Listen on 0.0.0.0 to allow public connections
server.listen(PORT, '0.0.0.0', () => {
    console.log(`BangaloreConnect is LIVE on port ${PORT}`);
});
