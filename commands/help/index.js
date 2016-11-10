var slack = require('../../lib/slack');

var helpMsg =
`commands:
*!brb* [min] - take break for [min] minutes (from auto-assign queue)
	* does not automatically log you back in, but you'll get pinged
*!back* - log back into the queue
*!out* [user] - log out of the queue for an indefinite period of time
	* if given, logs out [user]
*!help* - show this help message`

module.exports = {
	expr: /^!help/,
	run: function (data) {
		brb(data);
	}
};

function brb(data) {
	slack.sendMessage(helpMsg, data.channel);
}
