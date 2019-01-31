
/*
 * DEPRECATED
 * DEPRECATED
 * DEPRECATED
 */

const io = require('socket.io-client');
const socket = io('https://wallboard.company.com', {upgrade: false, transports: ['websocket']});

const authUser = require('../conf/config').wallboardUser;
const authKey = require('../conf/config').wallboardKey;

socket.on('connect', () => {
    socket.emit('auth', {user: authUser, pass: authKey});
    console.log(new Date().toLocaleString() + ' connected to wallboard');
});

socket.on('auth', res => {
    if (res.authed) {
        console.log(new Date().toLocaleString() + ' authenticated to wallboard');
    }
});

socket.on('data.on', ['support.breaks_data']);

module.exports = socket;