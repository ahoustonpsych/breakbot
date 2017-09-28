let slack = require('../../lib/slack').rtm;
let Promise = require('promise');

let conf = require('../../conf/config.breaks');
let globals = require('../../conf/config.globals');

let db = require('../../lib/database');
//var requests = require('../lc_requests');
//var breaks = require('../breaks');

let offs = {'!brb': 1, 'breakbot': 2};

/* USAGE:
 * !brb [time]
 * sets timer for [time] minutes
 * and sets user to "not accepting chats"
 * sends reminder every remindTime seconds when the break expires
 */
module.exports = {
    expr: /^(!brb)|(breakbot:? brb)/i,
    run: brb
};

function brb(data) {
    //console.log(Object.keys(globals))
    let breaks = globals[data.name].breaks;

    if (data.text.split(' ')[0].match(/!brb/i) !== null)
        off = offs['!brb'];
    else
        off = offs['breakbot'];

    let username = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];
    let arg = data.text.split(' ')[off];

    if (arg && arg.match(/me/i) !== null)
        arg = data.text.split(' ')[off + 1];

    /* debug. allows you to do !brb [time] [user] to log someone else task */
    //if (data.text.split(' ')[off + 1])
    //    username = slack.dataStore.getUserByName(data.text.split(' ')[off + 1]).profile.email.split('@')[0];

    /* prevents users from logging task again if they're already logged task */
    if (breaks.active[username] || breaks.over[username] || breaks.lunch[username] || breaks.bio[username]) {
        slack.sendMessage('already on break', data.channel);
    }
    else {
        parseBreakTime(arg)
            .then(function (time) {

                breaks.active[username] = {remaining: time};

                /* sets agent status to "not accepting chats" */
                slack.sendMessage('Set break for ' + username + ' for ' + time.toString() + ' minutes.', data.channel);

                // setBreak(username, time, data.channel);

                if (breaks.task.hasOwnProperty(username))
                    delete breaks.task[username];

                //breaks.active[username] = 1;

                breaks.active[username] = {
                    outTime: new Date().getTime(),
                    duration: time,
                    channel: data.channel,
                    remaining: time
                };

                /* logging */
                let logdata = {
                    username: username,
                    command: '!brb',
                    duration: time,
                    date: 'now'
                };

                db.log('command_history', logdata);
            })
            .catch(function (err) {
                console.error('ERROR PARSING BREAK TIME', err);
            });
    }
}

/*
 * sets break timer for [time] minutes
 */
function setBreak(username, time, channel) {
    if (typeof(breaks.task[username]) === 'number')
        delete breaks.task[username];

    breaks.active[username] = 1;

    requests.changeStatus(username, 'not accepting chats')
        .then(function (res) {
            breaks.active[username] = {
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

function parseBreakTime(time) {
    return new Promise(function (fulfill, reject) {
        /* sets break time to the default if it's not provided */
        if (!parseInt(time))
            fulfill(conf.defaultBreak);

        /* prevents the break time from being negative, zero, or higher than the max time */
        else if ((parseInt(time) > conf.maxBreak) || (parseInt(time) <= 0))
            fulfill(conf.defaultBreak);

        /* if all else is good, set break time properly */
        else
            fulfill(parseInt(time));
    });
}