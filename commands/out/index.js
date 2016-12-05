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

    var user = slack.dataStore.getUserById(data.user).name;
    var arg = data.text.split(' ')[1];

    //logs out [user] if given
	//otherwise, logs out user that used !out
    var username = arg != undefined ? arg : user; // TODO: validate this info

    logOut(username,
		function(response) {
            slack.sendMessage(
                'Logged out ' + username +
                '. Please use *!back* to log back in when you are ready',
                data.channel);
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

