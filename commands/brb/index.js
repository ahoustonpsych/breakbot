var slack = require('../../lib/slack');
var requests = require('./lc_requests.js');

var lc_user = require('../../config').lcAPIUser;
var lc_key = require('../../config').lcAPIKey;

var overbreak = [];

module.exports = {
	expr: /^!brb/,
	run: function (data) {
		brb(data);
	}
};

function brb(data) {
	var arg;
    var breakTime;

    arg = data.text.split(" ")[1];
	//default break time is 5 minutes
    breakTime = parseInt(arg) ? parseInt(arg).toString() : "5";

    //checks agent state
    requests.getState(slack.dataStore.getUserById(data.user).name);

    //sets state to "not accepting chats"
    requests.changeState(slack.dataStore.getUserById(data.user).name, "not accepting chats", function() {
    	setTimeout(function breakUp() {

            slack.sendMessage(slack.dataStore.getUserById(data.user).name + ": your break is up. Please use *!back* to log back into chats", data.channel);

            //TODO
			//setInterval("reminder")

    	}, breakTime * 60 * 1000);

        slack.sendMessage("Set break for " + slack.dataStore.getUserById(data.user).name + " for " + breakTime + " minutes.", data.channel);
	});

}