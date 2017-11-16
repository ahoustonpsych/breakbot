let slack = require('../../lib/slack').rtm;
let Promise = require('promise');

let globals = require('../../conf/config.globals');
let conf_breaks = require('../../conf/config.breaks');
let breakLib = require('../breaks');

let db = require('../../lib/database');
let topic = require('../topic');

/*
 * USAGE:
 * !task [user] [time] [reason]
 * [user] defaults to the user that sent the message, if not given
 * [time] is the length of the task break, in minutes
 * [reason] is the reason for the task break
 */
module.exports = {
    expr: /^(!task)|(breakbot:? task)/i,
    run: task
};

function task(data) {

    let user, users, time, reason,
        offset = 0, // arg offset
        chanObj = globals.channels[data.name],
        breaks = chanObj.breaks,
        msgArr = data.text.split(' '),
        arg = msgArr[0];

    if (isValidUser(arg)) {
        offset += 1;
        user = arg;
    }

    else
        user = data.username;

    /* offsets time/reason position by 1 if username is provided */
    time = msgArr[offset];
    reason = msgArr.slice(offset+1).join(' ');

    if (!time) {
        slack.sendMessage('err: no time or reason given. syntax: *!task [user] [time] [reason]*', data.channel);
        return;
    }

    //check for valid time
    //TODO merge with breakLib.parseBreakTime
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

    if (typeof(user) !== 'string') {
        console.error(new Date().toLocaleString() + ' INVALID USER FOR !task: ' + user);
        return;
    }

    breakLib.parseBreakTime(data.breakType, time)
        .then((parsedTime) => {

            setTask(user, parsedTime, reason, chanObj);

            /* logging */
            let logdata = {
                username: user,
                channel: data.name,
                duration: parsedTime,
                command: '!task',
                date: 'now',
                reason: reason
            };

            db.log('command_history', logdata)
                .catch(function (err) {
                    console.error(new Date().toLocaleString() + ' ERROR LOGGING COMMAND', err);
                });

        })
        .catch((err) => {
            /* invalid time */
            if (err)
                slack.sendMessage(err, data.channel);
            console.error(new Date().toLocaleString() + ' ERROR PARSING TASK TIME', err);
        });

    /* not used, uncomment if it becomes necessary to set multiple people on task at once */
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

function setTask(user, time, reason, chanObj) {
    let breaks = chanObj.breaks;

    /* nuke existing breaks */
    chanObj.clearBreaks(user, chanObj.name);

    breaks.task[user] = {
        outTime: new Date().getTime(),
        duration: time,
        channel: chanObj.name,
        remaining: time,
        reason: reason
    };

    slack.sendMessage('Put ' + user + ' on task for ' + time + ' minutes. ' +
        'Please use *!back* to log back in when you are done', chanObj.id);

}

function isValidUser(user) {
    let cleaned = topic.removeSpecial(user);
    return slack.getUser(cleaned) instanceof Object;
}

// function putOnTask(data, user, time, reason) {
//
//     let breaks = globals.channels[data.name].breaks;
//
//     if (users.length > 1)
//         slack.sendMessage('Put on task: ' + users.join(' ') + '. Please use *!back* to log back in when you are done',
//             data.channel);
//
//     else if (users.length == 1)
//         slack.sendMessage('Put on task: ' + users + '. Please use *!back* to log back in when you are done',
//             data.channel);
//
//     else
//         console.error(new Date().toLocaleString() + ' invalid user list for !task somehow: ' + users);
//
// }