var slack = require('../../lib/slack');
var requests = require('../lc_requests');
var breaks = require('../breaks');

module.exports = {
	expr: /^!out/,
	run: function (data) {
		out(data);
	}
};

function out(data) {

    var username = slack.dataStore.getUserById(data.user).name;
    var arg = data.text.split(' ')[1];

    //log out user
	if (arg == undefined) {
		logOut(
			username,
			//callback
			function (response) {
            slack.sendMessage(username +
                ': you have been logged out of chats. Please use *!back* to log back in when you are ready',
                data.channel);
            breaks.clearBreaks(username);
		});

	} else {
		//log out user
		logOut(
			arg,
			//callback
			function(response) {
            	slack.sendMessage(
            		'Logged out ' + arg +
					'. Please use *!back* to log back in when you are ready',
                	data.channel);
				breaks.clearBreaks(username);
			});
	}
}

function logOut(user, callback) {
    requests.changeStatus(
        user,
        "not accepting chats",
		//callback
        function (response) {
            callback(response);
        });
}

