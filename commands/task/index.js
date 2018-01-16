let slack = require('../../lib/slack').rtm;
let Promise = require('promise');
let conf = require('../../conf/config');

let globals = require('../../conf/config.globals');
let conf_breaks = require('../../conf/config.breaks');
let breakLib = require('../breaks');

let db = require('../../lib/database');
let topic = require('../topic');

let Helpers = require('../../lib/helpers');

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

    //data.username = 'cfisher';

    //TODO use just chanObj instead of support specifically
    globals.channels[conf.channelDesignation['support']].isSuper(data.username)
        .then(res => {
            //user is a supervisor, continue
            continueTask(data);
        })
        .catch(err => {
            console.error(new Date().toLocaleString(), `${data.username} is not a supervisor. Rejecting TASK`);
            slack.sendMessage('*err:* only supervisors may use this command', data.channel);
        });

}

function continueTask(data) {

    let user, time, reason,
        offset = 0, // arg offset, either 1 or 0 depending on if a username was given
        chanObj = globals.channels[data.name],
        breaks = chanObj.breaks,
        msgArr = data.text.split(' '),
        arg = msgArr[0];

    if (isValidUser(arg)) {
        offset += 1;
        user = arg;
    }

    else {
        //user = data.username;
        slack.sendMessage('*err:* no user given. syntax: *!task [user] [time] [reason]*', data.channel);
        return false;
    }

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

}

function setTask(user, time, reason, chanObj) {
    let breaks = chanObj.breaks,
        breakStart = new Date().getTime(),
        expireTime = new Date(breakStart + time * 60 * 1000),
        expireFormatted = Helpers.formatTime(expireTime);

    /* nuke existing breaks */
    chanObj.clearBreaks(user, chanObj.name);

    breaks.task[user] = {
        outTime: breakStart,
        duration: time,
        channel: chanObj.name,
        remaining: time,
        reason: reason
    };

    slack.sendMessage(`Set ${user} on task for ${time} minutes. See you at ${expireFormatted}!`, chanObj.id);
}

function isValidUser(user) {
    let cleaned = topic.removeSpecial(user);
    return slack.getUser(cleaned) instanceof Object;
}