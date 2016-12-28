var slack = require('../../lib/slack').rtm;
var requests = require('../lc_requests');
var breaks = require('../breaks');
var db = require('../../lib/database');

/*
 * USAGE:
 * !out [user]
 * sets [user] to "not accepting chats" indefinitely
 * [user] defaults to the user that sent the message, if not given
 */
module.exports = {
	expr: /^!out/,
	run: function (data) {
		out(data);
	}
};

function out(data) {

    var username = undefined;

    /* allows you to use !out [name] to log someone else out */
    var user = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];
    var arg = data.text.split(' ')[1];

    if (arg) {
        try {
            username = slack.dataStore.getUserByName(arg).profile.email.split('@')[0];
        }
        catch (e) {
            slack.sendMessage("Invalid user: " + arg, data.channel);

            //logging
            console.error(new Date() + ': ' + user + ' used !out with invalid user "' + arg + '"');
            return;
        }
    }
    else {
        username = user;
    }

    logOut(username, data);
}

function logOut(username, data) {
    slack.sendMessage('Logged out ' + username + '. Please use *!back* to log back in when you are ready', data.channel);

    breaks.clearBreaks(username);
    breaks.out[username] = 1;

    requests.changeStatus(username, "not accepting chats")
        .then(function (resp) {
            //logging
            //console.log(new Date() + ': logged out ' + username + ' with !out');
            db.logCommand(username, "!out", null)
                .catch(function(err) { console.error("ERROR LOGGING COMMAND", err); });
        })
        .catch(function (err) {
            console.error('ERROR CHANGING STATUS', err);
        });
}