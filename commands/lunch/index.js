var slack = require('../../lib/slack').rtm;

var conf = require('../../conf/breaks.config');
var db = require('../../lib/database');
var requests = require('../lc_requests');
var breaks = require('../breaks');

var offs = {'!lunch': 1, 'breakbot': 2};

/* lunch time */
var time = 30;

module.exports = {
    expr: /^(!lunch)|(breakbot:? lunch)/i,
    run: lunch
};

function lunch(data) {
    if (data.text.split(' ')[0].match(/!lunch/i) !== null)
        off = offs['!lunch'];
    else
        off = offs['breakbot'];

    var username = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];

    /* prevents users from logging out again if they're already logged out */
    if (breaks.lunch[username] instanceof Object) {
        slack.sendMessage('already on lunch', data.channel);
        return;
    }

    delete breaks.out[username];
    breaks.clearBreaks(username);

    /* sets agent status to "not accepting chats" */
    slack.sendMessage('Set lunch for ' + username + '. See you in 30 minutes!', data.channel);

    setBreak(username, time, data.channel);

    /* logging */
    var logdata = {
        username: username,
        command: '!lunch',
        duration: time,
        date: 'now'
    };

    db.log('command_history', logdata)
        .catch(function (err) {
            console.error('ERROR LOGGING COMMAND', err);
        });
}

/*
 * sets break timer for [time] minutes
 */
function setBreak(username, time, channel) {

    requests.changeStatus(username, 'not accepting chats')
        .then(function (res) {
            breaks.lunch[username] = {
                outTime: new Date().getTime(),
                duration: time,
                channel: channel,
                remaining: time
            };
        })
        .catch(function (err) {
            console.error('ERROR CHANGING STATUS', err);
        });
}
