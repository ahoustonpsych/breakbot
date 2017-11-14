let slack = require('../../lib/slack').rtm;

let conf_breaks = require('../../conf/config.breaks.js');
let globals = require('../../conf/config.globals');

let breakLib = require('../breaks');
let luncher = require('../luncher');

let db = require('../../lib/database');

/* lunch time */
const _time = 30;

module.exports = {
    expr: /^(!lunch)|(breakbot:? lunch)/i,
    run: lunch
};

function lunch(data) {

    let chanObj = globals.channels[data.name],
        breaks = chanObj.breaks,
        username = data.username,
        arg = data.text.split(' ')[0];

    if (arg) {
        scheduler(data);
        return true;
    }

    /* prevents users from taking a break if they're already on a break */
    // if (breaks.lunch[username] instanceof Object) {
    //     slack.sendMessage('already on lunch', data.channel);
    //     return;
    // }

    if (!breakLib.canTakeBreak(username, data.name))
        return false;

    luncher.clearLunch(username, data.name)
        .then(() => {})
        .catch((err) => {});

    delete breaks.task[username];
    chanObj.clearBreaks(username);

    breaks.lunch[username] = {
        outTime: new Date().getTime(),
        duration: _time,
        channel: data.name,
        remaining: _time
    };

    /* set break cooldown */
    breaks.cooldown[username] =
        new Date(new Date().getTime() + 60 * 1000 * (conf_breaks.breakCooldown + _time));

    /* sets agent status to "not accepting chats" */
    slack.sendMessage('Set lunch for ' + username + '. See you in 30 minutes!', data.channel);

    /* logging */
    let logdata = {
        username: username,
        channel: data.name,
        command: '!lunch',
        duration: _time,
        date: 'now'
    };

    db.log('command_history', logdata)
        .catch(function (err) {
            console.error(new Date().toLocaleString() + ' ERROR LOGGING COMMAND', err);
        });
}

/*
 * sets break timer for [time] minutes
 */
function setBreak(username, time, channel) {

    breaks.lunch[username] = {
        outTime: new Date().getTime(),
        duration: time,
        channel: channel,
        remaining: time
    };
}


function scheduler(data) {

    let user = data.username,
        arg = data.text.split(' ')[0];

    if (!arg)
        return false;

    /* !lunch list */
    if (arg.match(/^list$/i) !== null) {
        list = luncher.listLunch(data.name);

        if (!list) {
            slack.sendMessage('nobody scheduled for lunch', data.channel);
            return false;
        }

        else
            slack.sendMessage(list, data.channel);

        return true;
    }

    /* !lunch rm */
    else if (arg.match(/^rm$/i) !== null) {
        name = data.text.split(' ')[1];

        if (breakLib.isMe(name))
            name = user;

        removeLunch(name, data.channel);
        return true;
    }

    //match username if possible
    if (slack.getUser(arg) instanceof Object) {
        user = slack.getUser(arg).name;
        time = data.text.split(' ')[1];
    }

    /* match "me" if possible */
    else if (breakLib.isMe(arg)) {
        time = data.text.split(' ')[1];
    }

    //no arg given
    else
        time = arg;

    if (!time) {
        slack.sendMessage('no time given', data.channel);
        return false;
    }

    /* parse lunch time */
    lunchTime = parseTime(time);

    /* fail if time is invalid */
    if (!lunchTime) {
        slack.sendMessage('invalid time: ' + time, data.channel);
        return false;
    }

    /* add lunch if all else is good */
    luncher.addLunch(user, lunchTime, data.name)
        .then(() => {
            slack.sendMessage('Set lunch for: ' + user, data.channel);
        })
        .catch((err) => {
            //fail if already scheduled or if slot is full
            slack.sendMessage(err, data.channel);
        });
}

//returns date obj if time is valid, false otherwise
function parseTime(time) {

    let hour = -1;
    let minute = -1;

    let timeobj = new Date();

    let lunchtime = undefined;

    if (typeof(time) !== 'string')
        return false;

    //12:00
    if (time.match(/:/) !== null) {
        hour = parseInt(time.split(':')[0]);
        minute = parseInt(time.split(':')[1]);
    }

    //1200
    else if (time.match(/[0-9]{4}/) !== null) {
        hour = parseInt(time.slice(0, 2));
        minute = parseInt(time.slice(2, 4));
    }

    //100
    else if (time.match(/[0-9]{3}/) !== null) {
        hour = parseInt(time.slice(0,1));
        minute = parseInt(time.slice(1,3));
    }

    //12
    else if(time.match(/\b[0-9]{1,2}\b/) !== null) {
        hour = parseInt(time);
        minute = 0;
    }

    if (typeof(hour) !== 'number' || typeof(minute) !== 'number' || isNaN(hour) || isNaN(minute))
        return false;

    //only allow lunches at 15m intervals
    if (minute % 15 !== 0)
        return false;

    //fail if task of bounds
    if (hour > 23 || hour < 0 || minute > 59 || minute < 0)
        return false;

    lunchtime = new Date(timeobj.setHours(hour, minute, 0, 0));

    //add 12 hours until the desired time is later than the current time
    while (lunchtime < new Date()) {
        lunchtime = new Date(lunchtime.getTime() + 12 * 60 * 60 * 1000);
    }

    if (lunchtime instanceof Date) {
        return lunchtime;
    }

    else
        return false;

}

/*
 * Removes schedule lunch slot for "user", if possible
 */
function removeLunch(user, chanId) {

    //fail if invalid user
    if (!(slack.getUser(user) instanceof Object)) {
        slack.sendMessage('invalid user: ' + user, chanId);
        return false;
    }

    //fail if lunch time isn't valid
    luncher.clearLunch(user, chanId)
        .then((res) => {
            slack.sendMessage('removed lunch for: ' + user, chanId);
        })
        .catch((err) => {
            slack.sendMessage('lunch not found for: ' + user, chanId);
        });
}