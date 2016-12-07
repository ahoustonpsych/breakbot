var slack = require('../../lib/slack').rtm;
var requests = require('../lc_requests');
var breaks = require('../breaks');


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
    logOut(username,
        function (response) {
            slack.sendMessage(
                'Logged out ' + username +
                '. Please use *!back* to log back in when you are ready',
                data.channel);

            //logging
            console.log(new Date() + ': logged out ' + username + ' with !out');

            breaks.clearBreaks(username);
            breaks.out[username] = 1;
        });
}

function logOut(username, callback) {
    requests.changeStatus(
        username,
        "not accepting chats",
		//callback
        function (response) {
            callback(response);
        });
}