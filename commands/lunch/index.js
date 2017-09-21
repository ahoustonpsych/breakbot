var slack = require('../../lib/slack').rtm;

var conf = require('../../conf/config.breaks.js');
var db = require('../../lib/database');
var requests = require('../lc_requests');
let globals = require('../../conf/config.globals');
//var breaks = require('../breaks');
var luncher = require('../luncher');

var offs = {'!lunch': 1, 'breakbot': 2};

/* lunch time */
const _time = 30;

module.exports = {
    expr: /^(!lunch)|(breakbot:? lunch)/i,
    run: lunch
};

function lunch(data) {

    let breaks = globals[data.name].breaks;

    if (data.text.split(' ')[0].match(/!lunch/i) !== null)
        off = offs['!lunch'];
    else
        off = offs['breakbot'];

    var username = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];
    var arg = data.text.split(' ')[off];

    console.log('USERNAME: ' + username)

    if (arg) {
        scheduler(data);
        return true;
    }

    else {

        /* prevents users from logging out again if they're already logged out */
        if (breaks.lunch[username] instanceof Object) {
            slack.sendMessage('already on lunch', data.channel);
            return;
        }

        luncher.clearLunch(username, data.name);
        delete breaks.out[username];
        breaks.clearBreaks(username, data.name);

        /* sets agent status to "not accepting chats" */
        slack.sendMessage('Set lunch for ' + username + '. See you in 30 minutes!', data.channel);


        breaks.lunch[username] = {
            outTime: new Date().getTime(),
            duration: _time,
            channel: data.name,
            remaining: _time
        };

        //setBreak(username, _time, data.channel);

        /* logging */
        var logdata = {
            username: username,
            command: '!lunch',
            duration: _time,
            date: 'now'
        };

        db.log('command_history', logdata)
            .catch(function (err) {
                console.error('ERROR LOGGING COMMAND', err);
            });
    }
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

    var user = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];
    var arg = data.text.split(' ')[off];

    if (!arg)
        return false;

    //list command
    if (arg.match(/^list$/i) !== null) {
        list = luncher.listLunch(data.name);

        console.log('list: ')
        console.log(list)

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
        if (!(slack.dataStore.getUserByName(name) instanceof Object)) {
            slack.sendMessage('invalid user: ' + name, data.channel);
            return false;
        }

        //fail if lunch time doesn't exist
        else if (!(luncher.clearLunch(name, data.name))) {
            slack.sendMessage('lunch not found for: ' + name, data.channel);
            return false;
        }

        else {
            slack.sendMessage('removed lunch for: ' + name, data.channel);
            return true;
        }

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

    lunch = parseTime(time);

    //fail if time is invalid
    if (!lunch) {
        slack.sendMessage('invalid time: ' + time, data.channel);
        return false;
    }

    //fail if slot already taken
    if (!(luncher.checkDupe(lunch, data.name))) {
        slack.sendMessage('slot already taken: ' + time, data.channel);
        return false;
    }

    //add lunch if all else is good
    else {
        //but fail if they already have lunch scheduled
        if (!(luncher.addLunch(user, lunch, data.name)))
            slack.sendMessage('already scheduled: ' + user, data.channel);
        else {
            //minute = (lunch.getMinutes().toString().length < 2) ? '0' + lunch.getMinutes() : lunch.getMinutes();
            slack.sendMessage('Set lunch for: ' + user, data.channel);
        }
    }
}

//returns date obj if time is valid, false otherwise
function parseTime(time) {

    var hour = -1;
    var minute = -1;

    var timeobj = new Date();

    var lunchtime = undefined;

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

    //fail if out of bounds
    if (hour > 23 || hour < 0 || minute > 59 || minute < 0)
        return false;

    lunchtime = new Date(timeobj.setHours(hour, minute));

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