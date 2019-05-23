const express = require('express');
const socket = require('socket.io');
// const mysql = require('mysql');
const http = require('http');
const app = express();

const server = http.createServer(app);

const io = socket(server);

const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const passport = require('passport');
const path = require('path');

const users = require('./routes/api/users');
const profile = require('./routes/api/profile');

io.on('connection', function (socket) {
    console.log("Socket connected: " + socket.id);
    socket.on('action', (action) => {
        switch (action.type) {
            case 'server/SOCKET_MESSAGE':
                console.log("Got hello: ", action.payload);
                socket.emit('action', { type: 'server/SOCKET_MESSAGE', payload: 'good day!' });
                break;
            case 'server/CREATE_ROOM':
                console.log("Create room", action.payload);
                var room = action.payload;
                var clientsInRoom = io.sockets.adapter.rooms[room];
                var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
                console.log('Room ' + room + ' now has ' + numClients + ' client(s)');

                if (numClients === 0) {
                    socket.join(room);
                    console.log('Client ID ' + socket.id + ' created room ' + room);
                    socket.emit('action', { type: 'CREATE_ROOM!', sockedId: socket.id, room });
                    return;

                } else if (numClients <= 3) {
                    console.log('Client ID ' + socket.id + ' joined room ' + room);
                    io.sockets.in(room).emit('join', room);
                    socket.join(room);
                    socket.emit('joined', room, socket.id);
                    io.sockets.in(room).emit('ready');
                } else {
                    socket.emit('full', room);
                }
                break;
            default:
                break;
        }
    });
});
// io.sockets.on('connection', function(socket) {
//     function log() {
//         var array = ['Message from server:'];
//         array.push.apply(array, arguments);
//         socket.emit('log', array);
//     }
//     socket.on('message', function (message) {
//         console.log(message)
//         log('Client said: ', message);
//         // for a real app, would be room-only (not broadcast)
//         socket.broadcast.emit('message', message);
//     });
//     socket.on('create or join', function (room) {
//         log('Received request to create or join room ' + room);

//         var clientsInRoom = io.sockets.adapter.rooms[room];
//         var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
//         log('Room ' + room + ' now has ' + numClients + ' client(s)');

//         if (numClients === 0) {
//             socket.join(room);
//             log('Client ID ' + socket.id + ' created room ' + room);
//             socket.emit('created', room, socket.id);

//         } else if (numClients <= 3) {
//             log('Client ID ' + socket.id + ' joined room ' + room);
//             io.sockets.in(room).emit('join', room);
//             socket.join(room);
//             socket.emit('joined', room, socket.id);
//             io.sockets.in(room).emit('ready');
//         } else {
//             socket.emit('full', room);
//         }
//     });
//     socket.on('bye', function () {
//         console.log('received bye');
//     });
// });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const db = require('./config/keys').mongoURI;

mongoose
    .connect(process.env.mongoURI || db, { useNewUrlParser: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

app.use(passport.initialize());

require('./config/passport')(passport);
app.use(express.static('../../../client/build'));
app.use('/api/users', users);
app.use('/api/profile', profile);

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running on port ${port}`));