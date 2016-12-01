var slack = require('../../lib/slack');
var requests = require('../lc_requests');

var breaks = require('../breaks');

//default break time, in minutes
var defaultBreak = 5;

//max break time, in minutes
const maxBreak = 120;

//how long to wait between reminders to log back in, in seconds
var remindTime = 90;


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
    var username = slack.dataStore.getUserById(data.user).name;
    var arg = data.text.split(' ')[1];

    var breakTime;

    //check if already on break
    if (breaks.onbreak[username] || breaks.overbreak[username] || breaks.out[username]) {
        slack.sendMessage("already on break", data.channel);
    }
    else {

        //default break time is 5 minutes
        //max break time is 120 minutes
        breakTime = !parseInt(arg) ? defaultBreak : (parseInt(arg) > maxBreak ? defaultBreak : parseInt(arg));

        //sets agent status to "not accepting chats"
        setBreak(username, breakTime, data);
        slack.sendMessage("Set break for " + username + " for " + breakTime.toString() + " minutes.", data.channel);
    }
}

/*
 * sets break timer for [time] minutes
 */
function setBreak(username, time, data) {
    requests.changeStatus(
        username,
        "not accepting chats",
        //callback
        function () {
            breaks.onbreak[username] = setTimeout(
                //callback
                function () {
                    breakUp(username, data);
                },
                time * 60 * 1000);
        });
}

/*
 * this function removes the onbreak timer when it expires naturally,
 * and sets the overbreak timer
 * which sends reminders to log back in
 */
function breakUp(username, data) {
    delete breaks.onbreak[username];

    slack.sendMessage(username +
        ": your break is up. Please use *!back* to log back into chats",
        data.channel);

    breaks.overbreak[username] = setInterval(
        //callback
        //sends reminder to log back in when break is up
        function sendReminder() {
            slack.sendMessage(username +
                ": you need to log back into chats with *!back*",
                data.channel);
        },
        remindTime * 1000);

    return 1;
}
