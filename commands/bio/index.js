let slack = require('../../lib/slack').rtm;

let conf_breaks = require('../../conf/config.breaks.js');
let db = require('../../lib/database');
let requests = require('../lc_requests');
let globals = require('../../conf/config.globals');
let breakLib = require('../breaks');

let offs = {'!bio': 1, 'breakbot': 2};

/* bio time */
let time = 5;

module.exports = {
    expr: /^(!bio)|(breakbot:? bio)/i,
    run: bio
};

function bio(data) {

    let breaks = globals.channels[data.name].breaks;

    if (data.text.split(' ')[0].match(/!bio/i) !== null)
        off = offs['!bio'];
    else
        off = offs['breakbot'];

    let username = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];

    if (!breakLib.canTakeBreak(username, data.name))
        return false;

    /* prevents users from logging task again if they're already logged task */
    // if (breakLib.isOnBreak(username, data.name)) {
    //     slack.sendMessage('already on break', data.channel);
    //     return false;
    // }
    //
    // if (breaks.cooldown.hasOwnProperty(username)) {
    //     slack.sendMessage('too soon since last break', data.channel);
    //     return false;
    // }
    //
    // if (!(globals.channels[data.name].breaks.increment(data.name, username))) {
    //     slack.sendMessage('err: hit daily break limit (' + conf.maxDailyBreaks + ')', data.channel);
    //     return false;
    // }

    delete breaks.task[username];
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
