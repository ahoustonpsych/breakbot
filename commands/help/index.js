var slack = require('../../lib/slack');

module.exports = {
	expr: /^!help/,
	run: function (data) {
		brb(data);
	}
};

function brb(data) {
	slack.sendMessage('help function not yet ready', data.channel);
}
