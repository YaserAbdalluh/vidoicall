require('dotenv').config();
const express = require('express');
const socketio = require('socket.io');
const ejs = require('ejs');
const { v4: uuidV4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.redirect(`/${uuidV4()}`);
});

app.get('/:room', (req, res) => {
    res.render('room', {
        roomId: req.params.room,
        appName: 'Video Chat App'
    });
});

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const io = socketio(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', socket => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId);

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });

        socket.on('signal', (data) => {
            const { to } = data;
            if (to) {
                io.to(to).emit('signal', data);
            } else {
                socket.to(data.roomId).emit('signal', data);
            }
        });
    });
});
