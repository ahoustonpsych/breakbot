var slack = require('../../lib/slack');

module.exports = {
	expr: /^!brb/,
	run: function (data) {
		brb(data);
	}
};

function brb(data) {
	var arg = data.text.split(" ")[1];
	//default break time is 5 minutes
	var breakTime = parseInt(arg) ? parseInt(arg).toString() : "5";

	slack.sendMessage("Set break for " + slack.dataStore.getUserById(data.user).name + " for " + breakTime + " minutes.", data.channel);
}

