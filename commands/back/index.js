var slack = require('../../lib/slack');
var requests = require('../lc_requests');
var breaks = require('../breaks');

module.exports = {
	expr: /^!back/,
	run: function (data) {
		back(data);
	}
};

function back(data) {
	var username = slack.dataStore.getUserById(data.user).name;

    logIn(username, data);
	breaks.clearBreaks(username);
}

function logIn(user, data) {
    requests.changeStatus(
        user,
        "accepting chats",
        function () {
        	slack.sendMessage(user +
				': you have been logged back in.',
				data.channel);
        });
}