const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, maxHttpBufferSize: 1e7 });

app.use(express.static(path.join(process.cwd())));

let waitingPool = []; // Pool for multiple waiting users

app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

io.on('connection', (socket) => {
    socket.on('find-match', (userData) => {
        socket.userData = userData;

        // Clean pool: filter out disconnected users
        waitingPool = waitingPool.filter(s => s.connected);

        if (waitingPool.length > 0) {
            // Match found: Take the oldest person waiting
            const partner = waitingPool.shift();
            
            const roomId = `room-${socket.id}-${partner.id}`;
            socket.join(roomId);
            partner.join(roomId);
            
            socket.currentRoom = roomId;
            partner.currentRoom = roomId;
            socket.partnerId = partner.id;
            partner.partnerId = socket.id;

            socket.emit('match-found', partner.userData);
            partner.emit('match-found', socket.userData);
        } else {
            // Put current user in the pool
            waitingPool.push(socket);
        }
    });

    socket.on('typing', () => {
        if (socket.currentRoom) socket.to(socket.currentRoom).emit('partner-typing');
    });

    socket.on('reaction', (data) => {
        if (socket.currentRoom) socket.to(socket.currentRoom).emit('receive-reaction', data);
    });

    socket.on('send-message', (content) => {
        if (socket.currentRoom) socket.to(socket.currentRoom).emit('receive-message', content);
    });

    socket.on('disconnect', () => {
        waitingPool = waitingPool.filter(s => s.id !== socket.id);
        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('partner-disconnected');
        }
    });
});

server.listen(8080, '0.0.0.0', () => console.log('OMIGLE LIVE ON 8080'));
