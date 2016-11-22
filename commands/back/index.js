var slack = require('../../lib/slack');
var requests = require('../lc_requests');
var breaks = require('../breaks');

/*
 * USAGE:
 * !back
 * sets user status to "accepting chats"
 */
module.exports = {
	expr: /^!back/,
	run: function (data) {
		back(data);
	}
};

function back(data) {
	var username = slack.dataStore.getUserById(data.user).name;

	//change state to "accepting chats"
    logIn(username, data);
	breaks.clearBreaks(username);
	delete breaks.out[username];
}

function logIn(username, data) {
    requests.changeStatus(
        username,
        "accepting chats",
        function () {
        	slack.sendMessage(username +
				': you have been logged back in.',
				data.channel);
        });
}