var slack = require('../../lib/slack').rtm;
var requests = require('../lc_requests');

var breaks = require('../breaks');

//default break time, in minutes
var defaultBreak = 5;

//max break time, in minutes
const maxBreak = 120;

//how long to wait between reminders to log back in, in seconds
var remindTime = 4;


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
    var breakTime;

    var username = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];
    var arg = data.text.split(' ')[1];

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

        //logging
        console.log(new Date() + ': logged out ' + username + ' with !brb for ' + breakTime.toString() + ' minutes');
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
                time * 1000);
        });
}

/*
 * this function removes the onbreak timer when it expires naturally,
 * and sets the overbreak timer
 * which sends reminders to log back in
 * but only if that user hasn't already logged back in manually yet (without the bot)
 */
function breakUp(username, data) {
    delete breaks.onbreak[username];

    requests.getAgentStatus(username, function (status) {
        if (status == "not accepting chats") {
            slack.sendMessage(username +
                ": your break is up. Please use *!back* to log back into chats",
                data.channel);

            breaks.overbreak[username] = setInterval(
                //callback
                //sends reminder to log back in when break is up
                //if not already logged back in
                function sendReminder() {
                    requests.getAgentStatus(username, function (status) {
                        if (status == "not accepting chats") {
                            slack.sendMessage(username +
                                ": you need to log back into chats with *!back*",
                                data.channel);
                        }
                        else {
                            clearInterval(breaks.overbreak[username]);
                            delete breaks.overbreak[username];
                        }
                    });
                }, remindTime * 1000);
        }
        else {
            console.log(status);
        }
    });

    return 1;
}
