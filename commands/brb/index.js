var slack = require('../../lib/slack');
var requests = require('../lc_requests');

var breaks = require('../breaks');

//default break time, in minutes
var defaultBreak = 5;

//max break time, in minutes
const maxBreak = 120;

//how long to wait between reminders to log back in, in seconds
var remindTime = 2;

//don't touch this
//var defaultBreak = _defaultBreak;

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
    if (breaks.onbreak[username] || breaks.overbreak[username]) {
        slack.sendMessage("already on break", data.channel);
    } else {
        //default break time is 5 minutes
        //max break time is 120 minutes
        breakTime = !parseInt(arg) ? defaultBreak : (parseInt(arg) > maxBreak ? defaultBreak : parseInt(arg));

        //sets state to "not accepting chats"
        setBreak(username, breakTime, data);
        slack.sendMessage("Set break for " + username + " for " + breakTime.toString() + " minutes.", data.channel);
    }
}

function setBreak(user, time, data) {

    requests.changeStatus(
        user,
        "not accepting chats",
        //callback
        function () {
            breaks.onbreak[user] = setTimeout(
                //callback
                function () {
                    breakUp(user, data);
                },
                time * 60 * 1000);
        });
}

function breakUp(user, data) {
    delete breaks.onbreak[user];

    slack.sendMessage(user +
        ": your break is up. Please use *!back* to log back into chats",
        data.channel);

    breaks.overbreak[user] = setInterval(
        //callback
        function () {
            sendReminder(user, data);
        },
        remindTime * 1000);

    return 1;
}

function sendReminder(user, data) {
    console.log(breaks.onbreak[user]);
    console.log(breaks.overbreak[user]);
    slack.sendMessage(user +
        ": you need to log back into chats with *!back*",
        data.channel);

    return 1;
}
