let slack = require('../../lib/slack').rtm;

let globals = require('../../conf/config.globals');
let breakLib = require('../breaks');

let db = require('../../lib/database');

/*
 * USAGE:
 * !back or breakbot back
 * sets user status to "accepting chats"
 */
module.exports = {
    expr: /^(!back)|(breakbot:? back)/i,
    run: back
};

function back(data) {

    let username = data.username;

    if (!breakLib.isOnBreak(username, data.name)) {
        slack.sendMessage('err: not on break', data.channel);
        return false;
    }

    removeBreak(username, data);

    /* logging */
    let logdata = {
        username: username,
        channel: data.name,
        date: 'now',
        command: '!back'
    };

    db.log('command_history', logdata)
        .catch(function (err) {
            console.error(new Date().toLocaleString() + ' ERROR LOGGING COMMAND', err);
        });

}

/* log user in */
function removeBreak(user, data) {

    let chanObj = globals.channels[data.name],
        breaks = chanObj.breaks;

    chanObj.clearBreaks(user);
    delete breaks.task[user];

    slack.sendMessage(user + ': welcome back!', data.channel);

}