const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, { 
    cors: { origin: "*" },
    maxHttpBufferSize: 1e7 
});

app.use(express.static(path.join(process.cwd())));

let waitingUser = null; // The person currently looking for a match
let onlineCount = 0; 

app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

io.on('connection', (socket) => {
    onlineCount++;
    io.emit('user-count', onlineCount);

    socket.on('find-match', (userData) => {
        socket.userData = userData;

        // Validation: If there's a waiting user and they are still connected
        if (waitingUser && waitingUser.id !== socket.id && waitingUser.connected) {
            const partner = waitingUser;
            const roomId = `room-${socket.id}-${partner.id}`;
            
            socket.join(roomId);
            partner.join(roomId);
            
            socket.currentRoom = roomId;
            partner.currentRoom = roomId;
            socket.partnerId = partner.id;
            partner.partnerId = socket.id;

            // Notify both users
            socket.emit('match-found', partner.userData);
            partner.emit('match-found', socket.userData);
            
            waitingUser = null; // Clear the queue for the next pair
            console.log(`Match created: ${socket.id} & ${partner.id}`);
        } else {
            // If nobody is waiting, this user becomes the waiting user
            waitingUser = socket;
            console.log(`User ${socket.id} is now waiting...`);
        }
    });

    socket.on('typing', () => {
        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('partner-typing');
        }
    });

    socket.on('reaction', (data) => {
        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('receive-reaction', data);
        }
    });

    socket.on('send-message', (content) => {
        if (socket.currentRoom) {
            socket.to(socket.currentRoom).emit('receive-message', content);
        }
    });

    socket.on('disconnect', () => {
        onlineCount = Math.max(0, onlineCount - 1);
        io.emit('user-count', onlineCount);

        // If the person who disconnected was the one waiting, clear the slot
        if (waitingUser && waitingUser.id === socket.id) {
            waitingUser = null;
        }

        // If they were in a chat, notify the partner
        if (socket.currentRoom) {
            io.to(socket.currentRoom).emit('partner-disconnected');
            const partnerSocket = io.sockets.sockets.get(socket.partnerId);
            if (partnerSocket) {
                partnerSocket.leave(socket.currentRoom);
                partnerSocket.currentRoom = null;
                partnerSocket.partnerId = null;
            }
        }
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`OMIGLE is LIVE on port ${PORT}`);
});
