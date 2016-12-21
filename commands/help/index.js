var slack = require('../../lib/slack').rtm;

var db = require('../../database');

var helpMsg =
"commands:\n\
*!brb* [min] - take break for [min] minutes (from auto-assign queue)\n\
	* does not automatically log you back in, but you'll get pinged\n\
*!back* - log back into the queue\n\
*!out* [user] - log out of the queue for an indefinite period of time\n\
	* if given, logs out [user]\n\
*!list* - list users on break\n\
*!help* - show this help message";

/*
 * USAGE:
 * !help
 * sends help message
 */
module.exports = {
	expr: /^!help/,
	run: function (data) {
		help(data);
	}
};

function help(data) {
	slack.sendMessage(helpMsg, data.channel);
    db.logCommand(null, "!help", null)
        .catch(function(err) { console.error("ERROR LOGGING COMMAND", err); });
}
