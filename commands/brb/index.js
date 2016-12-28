var slack = require('../../lib/slack').rtm;
var Promise = require('promise');

var conf = require('../../conf/breaks.config');
var requests = require('../lc_requests');
var breaks = require('../breaks');

var db = require('../../lib/database');


/* USAGE:
 * !brb [time]
 * sets timer for [time] minutes
 * and sets user to "not accepting chats"
 * sends reminder every remindTime seconds when the break expires
 */
module.exports = {
	expr: /^!brb/,
	run: function (data) {
	    brb(data);
	}
};

function brb(data) {

    var username = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];
    var arg = data.text.split(' ')[1];

    /* debug. allows you to do !brb [time] [user] to log someone else out */
    if(data.text.split(' ')[2])
        username = slack.dataStore.getUserByName(data.text.split(' ')[2]).profile.email.split('@')[0];

    /* prevents users from logging out again if they're already logged out */
    if (breaks.onbreak[username] || breaks.overbreak[username]) {
        slack.sendMessage("already on break", data.channel);
    }
    else {
        parseBreakTime(arg)
            .then(function (time) {

                breaks.onbreak[username] = { remaining: time };

                /* sets agent status to "not accepting chats" */
                slack.sendMessage("Set break for " + username + " for " + time.toString() + " minutes.", data.channel);
                setBreak(username, time, data.channel);

                //logging
                //console.log(new Date() + ': logged out ' + username + ' with !brb for ' + time.toString() + ' minutes');
                db.logCommand(username, "!brb", time)
                    .catch(function(err) { console.error("ERROR LOGGING COMMAND", err); });
            })
            .catch(function (err) { console.error('ERROR PARSING BREAK TIME', err); });
    }
}

/*
 * sets break timer for [time] minutes
 */
function setBreak(username, time, channel) {
    if(typeof(breaks.out[username]) === 'number')
        delete breaks.out[username];

    breaks.onbreak[username] = 1;

    requests.changeStatus(username, "not accepting chats")
        .then(function (res) {
            breaks.onbreak[username] = {
                outTime: new Date().getTime(),
                duration: time,
                channel: channel,
                remaining: time
            };
        })
        .catch(function (err) { console.error('ERROR CHANGING STATUS', err); });
}

function parseBreakTime(time) {
    return new Promise(function (fulfill, reject) {
        /* sets break time to the default if it's not provided */
        if(!parseInt(time))
            fulfill(conf.defaultBreak);

        /* prevents the break time from being negative, zero, or higher than the max time */
        else if((parseInt(time) > conf.maxBreak) || (parseInt(time) <= 0))
            fulfill(conf.defaultBreak);

        /* if all else is good, set break time properly */
        else
            fulfill(parseInt(time));
    });
}