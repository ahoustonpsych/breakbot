var slack = require('../../lib/slack');

module.exports = {
	expr: /^!out/,
	run: function (data) {
		brb(data);
	}
};

function brb(data) {
	slack.sendMessage('out function not yet ready', data.channel);
}
