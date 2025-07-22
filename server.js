require('dotenv').config();
const express = require('express');
const socketio = require('socket.io');
const ejs = require('ejs');
const { v4: uuidV4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001; 
 
// الإعدادات
app.set('view engine', 'ejs');
app.use(express.static('public'));

// المسارات
app.get('/', (req, res) => {
    res.redirect(`/${uuidV4()}`);
});

app.get('/:room', (req, res) => {
    res.render('room', {
        roomId: req.params.room,
        appName: 'Video Chat App'
    });
});

// بدء الخادم
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// إعداد Socket.io
const io = socketio(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// معالجة اتصالات Socket.io
io.on('connection', socket => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);

        // إرسال إعلام لجميع المستخدمين في الغرفة ما عدا المستخدم الجديد
        socket.to(roomId).emit('user-connected', userId);

        socket.on('disconnect', () => {
            // إرسال إعلام انفصال المستخدم
            socket.to(roomId).emit('user-disconnected', userId);
        });

        // معالجة إشارات WebRTC
        socket.on('signal', (data) => {
            // إرسال الإشارة إلى المستخدم الآخر في الغرفة
            socket.to(roomId).emit('signal', data);
        });
    });
});