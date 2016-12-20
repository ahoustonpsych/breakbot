var slack = require('../../lib/slack').rtm;
var requests = require('../lc_requests');
var breaks = require('../breaks');

var db = require('../../database').db;

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
	var username = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];
    if(data.text.split(' ')[1]) username = slack.dataStore.getUserByName(data.text.split(' ')[1]).profile.email.split('@')[0];
	/* change state to "accepting chats" */
    logIn(username, data);
}

function logIn(username, data) {

	slack.sendMessage(username + ': you have been logged back in.', data.channel);

	breaks.clearBreaks(username);
	delete breaks.out[username];

	requests.changeStatus(username, "accepting chats")
		.then(function (res) {

			//logging
			//console.log(new Date() + ': logged in ' + username + ' with !back');
            db.run("INSERT INTO command_history values(datetime('now'), '" + username + "', '!back', NULL)");
		})
		.catch(function (err) {
			console.error('ERROR CHANGING STATUS', err);
		});
}