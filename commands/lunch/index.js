let slack = require('../../lib/slack').rtm;

let conf = require('../../conf/config.breaks.js');
let db = require('../../lib/database');
//let requests = require('../lc_requests');
let globals = require('../../conf/config.globals');
let breakLib = require('../breaks');
let luncher = require('../luncher');

let offs = {'!lunch': 1, 'breakbot': 2};

/* lunch time */
const _time = 30;

module.exports = {
    expr: /^(!lunch)|(breakbot:? lunch)/i,
    run: lunch
};

function lunch(data) {

    let breaks = globals.channels[data.name].breaks;

    if (data.text.split(' ')[0].match(/!lunch/i) !== null)
        off = offs['!lunch'];
    else
        off = offs['breakbot'];

    let username = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];
    let arg = data.text.split(' ')[off];

    //console.log('USERNAME: ' + username)

    if (arg) {
        scheduler(data);
        return true;
    }


    /* prevents users from logging out again if they're already logged out */
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
    breaks.clearBreaks(username);

    if (!(breaks.increaseBreakCount(username))) {
        slack.sendMessage('err: hit daily break limit (' + conf.maxDailyBreaks + ')', data.channel);
        return false;
    }

    breaks.lunch[username] = {
        outTime: new Date().getTime(),
        duration: _time,
        channel: data.name,
        remaining: _time
    };

    /* sets agent status to "not accepting chats" */
    slack.sendMessage('Set lunch for ' + username + '. See you in 30 minutes!', data.channel);

    //setBreak(username, _time, data.channel);

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
            console.error('ERROR LOGGING COMMAND', err);
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

    // requests.changeStatus(username, 'not accepting chats')
    //     .then(function (res) {
    //         breaks.lunch[username] = {
    //             outTime: new Date().getTime(),
    //             duration: time,
    //             channel: channel,
    //             remaining: time
    //         };
    //     })
    //     .catch(function (err) {
    //         console.error('ERROR CHANGING STATUS', err);
    //     });
}


function scheduler(data) {

    let user = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];
    let arg = data.text.split(' ')[off];

    if (!arg)
        return false;

    //list command
    if (arg.match(/^list$/i) !== null) {
        list = luncher.listLunch(data.name);

        // console.log('list: ')
        // console.log(list)

        if (!list) {
            slack.sendMessage('nobody scheduled for lunch', data.channel);
            return false;
        }

        else
            slack.sendMessage(list, data.channel);

        return true;
    }

    //rm command
    //TODO split this into its own func
    else if (arg.match(/^rm$/i) !== null) {
        name = data.text.split(' ')[off+1];

        if (!name || name.match(/^me$/i) !== null)
            name = user;

        //fail if invalid user
        if (!(slack.getUser(name) instanceof Object)) {
            slack.sendMessage('invalid user: ' + name, data.channel);
            return false;
        }
        //fail if lunch time doesn't exist
        luncher.clearLunch(name, data.name)
            .then((res) => {
                slack.sendMessage('removed lunch for: ' + name, data.channel);
                return false
            })
            .catch((err) => {
                slack.sendMessage('lunch not found for: ' + name, data.channel);
                //return false;
            });

        return;
    }

    //match username if possible
    if (slack.dataStore.getUserByName(arg) instanceof Object) {
        user = slack.dataStore.getUserByName(arg).profile.email.split('@')[0];
        time = data.text.split(' ')[off + 1];
    }

    //match 'me'
    else if (arg.match(/^me$/i) !== null) {
        time = data.text.split(' ')[off + 1];
    }

    //no arg given
    else
        time = arg;

    if (!time) {
        slack.sendMessage('no time given', data.channel);
        return false;
    }

    lunchTime = parseTime(time);

    //fail if time is invalid
    if (!lunchTime) {
        slack.sendMessage('invalid time: ' + time, data.channel);
        return false;
    }

    //fail if slot already taken
    // if (!(luncher.checkDupe(lunch, data.name))) {
    //     slack.sendMessage('slot already taken: ' + time, data.channel);
    //     return false;
    // }

    //add lunch if all else is good
    luncher.addLunch(user, lunchTime, data.name)
        .then(() => {
            slack.sendMessage('Set lunch for: ' + user, data.channel);
        })
        .catch((err) => {
            //console.log(err);
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

    //console.log('hour: ' + hour);
    //console.log('minute: ' + minute);

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