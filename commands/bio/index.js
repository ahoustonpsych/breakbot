var slack = require('../../lib/slack').rtm;

var conf = require('../../conf/config.breaks.js');
var db = require('../../lib/database');
var requests = require('../lc_requests');
let globals = require('../../conf/config.globals');
// var breaks = require('../breaks');

var offs = {'!bio': 1, 'breakbot': 2};

/* bio time */
var time = 5;

module.exports = {
    expr: /^(!bio)|(breakbot:? bio)/i,
    run: bio
};

function bio(data) {

    let breaks = globals[data.name].breaks;

    if (data.text.split(' ')[0].match(/!bio/i) !== null)
        off = offs['!bio'];
    else
        off = offs['breakbot'];

    var username = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];

    /* prevents users from logging out again if they're already logged out */
    if (breaks.bio[username] instanceof Object) {
        slack.sendMessage('already on bio', data.channel);
        return;
    }

    delete breaks.out[username];
    breaks.clearBreaks(username, data.name);

    /* sets agent status to "not accepting chats" */
    slack.sendMessage('Set ' + time.toString() + ' minute bio for ' + username + '.', data.channel);

    //setBreak(username, time, data.channel);

    breaks.bio[username] = {
        outTime: new Date().getTime(),
        duration: time,
        channel: data.channel,
        remaining: time
    };

    /* logging */
    let logdata = {
        username: username,
        command: '!bio',
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
            breaks.bio[username] = {
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
