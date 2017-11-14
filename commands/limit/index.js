let slack = require('../../lib/slack').rtm;
let breaks = require('../breaks');
let db = require('../../lib/database');

let conf = require('../../conf/config');
let globals = require('../../conf/config.globals');

/*
 * USAGE:
 * !task [user]
 * sets [user] to "not accepting chats" indefinitely
 * [user] defaults to the user that sent the message, if not given
 */
module.exports = {
    expr: /^(!limit)|(breakbot:? limit)/i,
    run: limit
};

function limit(data) {

    if (!globals.channels.hasOwnProperty(data.name))
        return false;

    slack.sendMessage('max users on break: ' + globals.channels[data.name].maxOnBreak, data.channel);

    /* logging */
    let logdata = {
        username: data.username,
        channel: data.name,
        command: '!limit',
        date: 'now'
    };

    db.log('command_history', logdata)
        .catch(function (err) {
            console.error(new Date().toLocaleString() + ' ERROR LOGGING COMMAND', err);
        });

    return true;
}