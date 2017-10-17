let slack = require('../../lib/slack').rtm;
let Promise = require('promise');
let globals = require('../../conf/config.globals');
let conf_breaks = require('../../conf/config.breaks');
//var breaks = require('../breaks');
let db = require('../../lib/database');
let topic = require('../topic');

let offs = {'!task': 1, 'breakbot': 2};

/*
 * USAGE:
 * !task [user]
 * sets [user] to "not accepting chats" indefinitely
 * [user] defaults to the user that sent the message, if not given
 */
module.exports = {
    expr: /^(!task)|(breakbot:? task)/i,
    run: task
};

function task(data) {

    let user, users, time, reason;
    let breaks = globals.channels[data.name].breaks;

    if (data.text.split(' ')[0].match(/^!task/i) !== null)
        off = offs['!task'];
    else
        off = offs['breakbot'];

    let arg = data.text.split(' ')[off];

    if (isValidUser(arg)) {
        //offset remaining args if user is given
        off += 1;
        user = arg;
    }

    else
        user = data.username;

    time = data.text.split(' ')[off];
    reason = data.text.split(' ')[off+1];

    if (!time) {
        slack.sendMessage('err: no time or reason given. syntax: *!task [user] [time] [reason]*', data.channel);
        return;
    }

    //check for valid time
    if (isNaN(parseInt(time))) {
        slack.sendMessage('err: invalid time. syntax: *!task [user] [time] [reason]*', data.channel);
        return;
    }

    if (!reason) {
        slack.sendMessage('err: no reason given. syntax: *!task [user] [time] [reason]*', data.channel);
        return;
    }

    if (globals.channels[data.name].breaks.task.hasOwnProperty(user)) {
        slack.sendMessage('err: already on task', data.channel);
        return;
    }

    if (typeof(user) === 'string') {
        parseBreakTime(time)
            .then((time) => {

                /* nuke existing breaks */
                breaks.clearBreaks(user, data.name);

                breaks.task[user] = {
                    outTime: new Date().getTime(),
                    duration: time,
                    channel: data.channel,
                    remaining: time
                };

                slack.sendMessage('Put ' + user + ' on task for ' + time + ' minutes. ' +
                    'Please use *!back* to log back in when you are done', data.channel);

                /* logging */
                let logdata = {
                    username: user,
                    channel: data.name,
                    duration: time,
                    command: '!task',
                    date: 'now',
                    reason: reason
                };

                db.log('command_history', logdata)
                    .catch(function (err) {
                        console.error(new Date().toLocaleString() + ' ERROR LOGGING COMMAND', err);
                    });

            })
            .catch(function (err) {
                console.error(new Date().toLocaleString() + ' ERROR PARSING TASK TIME', err);
            });
    }

    else
        console.error(new Date().toLocaleString() + ' INVALID USER FOR !task: ' + user);

    /* user who sent the !task message */
    //let user = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];

    /* split up the list of users, discarding 'invalid' ones except for 'me' */
    // users = data.text.split(' ')
    //     .slice(off)
    //     .filter(function (el) {
    //
    //         /* match 'me' for later use */
    //         if (el.match(/^me$/i) !== null)
    //             return true;
    //
    //         /* match usernames if given, and discard the rest */
    //         else
    //             return (slack.dataStore.getUserByName(el) instanceof Object);
    //
    //     })
    //     .map(function (el) {
    //
    //         /* replace 'me' with your username if given */
    //         if (el.match(/^me$/i) !== null)
    //             return data.username;
    //
    //         /* otherwise, don't do anything */
    //         return el;
    //
    //     });

    /* if we have an invalid array somehow, just default to the user that sent the message*/
    // if (users instanceof Array) {
    //     if (users.length === 0) {
    //         users = [user];
    //     }
    // }

    // else
         //users = [user];

    /* log task users */
    // if (users instanceof Array)
    //     putOnTask(data, users);



}

function isValidUser(user) {
    let cleaned = topic.removeSpecial(user);
    return slack.getUser(cleaned) instanceof Object;
}

function putOnTask(data, user, time, reason) {

    let breaks = globals.channels[data.name].breaks;

    if (users.length > 1)
        slack.sendMessage('Put on task: ' + users.join(' ') + '. Please use *!back* to log back in when you are done',
            data.channel);

    else if (users.length == 1)
        slack.sendMessage('Put on task: ' + users + '. Please use *!back* to log back in when you are done',
            data.channel);

    else
        console.error(new Date().toLocaleString() + ' invalid user list for !task somehow: ' + users);

}

/* TODO merge with brb command */
function parseBreakTime(time) {
    return new Promise(function (fulfill, reject) {
        /* sets break time to the default if it's not provided */
        if (!parseInt(time))
            fulfill(conf_breaks.defaultBreak);

        /* prevents the break time from being negative, zero, or higher than the max time */
        else if ((parseInt(time) > conf_breaks.maxBreak) || (parseInt(time) <= 0))
            fulfill(conf_breaks.defaultBreak);

        /* if all else is good, set break time properly */
        else
            fulfill(parseInt(time));
    });
}