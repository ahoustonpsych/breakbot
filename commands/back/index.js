let slack = require('../../lib/slack').rtm;

let db = require('../../lib/database');
let globals = require('../../conf/config.globals');
let breakLib = require('../breaks');

let conf_breaks = require('../../conf/config.breaks');

/* argument offsets, used to allow multi-word commands */
let offs = {'!back': 1, 'breakbot': 2};

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

    if (data.text.split(' ')[0].match(/!back/i) !== null)
        off = offs['!back'];
    else
        off = offs['breakbot'];

    let username = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];

    if (!breakLib.isOnBreak(username, data.name)) {
        slack.sendMessage('err: not on break', data.channel);
        return false;
    }

    //if (data.text.split(' ')[off])
    //    username = slack.dataStore.getUserByName(data.text.split(' ')[off]).profile.email.split('@')[0];
    logIn(data, username);

}

/* log user in */
function logIn(data, username) {

    let chanObj = globals.channels[data.name];
    let breaks = globals.channels[data.name].breaks;

    chanObj.clearBreaks(username);
    delete breaks.task[username];

    // breaks.cooldown[username] = new Date(new Date().getTime() + 60 * 1000 * conf_breaks.breakCooldown);

    slack.sendMessage(username + ': welcome back!', data.channel);

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