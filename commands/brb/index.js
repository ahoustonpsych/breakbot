var slack = require('../../lib/slack');

module.exports = {
	expr: /^!brb/,
	run: function (data) {
		brb(data);
	}
};

function brb(data) {
	slack.sendMessage('brb function not yet ready', data.channel);
}

