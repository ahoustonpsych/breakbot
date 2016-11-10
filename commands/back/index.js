var slack = require('../../lib/slack');

module.exports = {
	expr: /^!back/,
	run: function (data) {
		back(data);
	}
};

function back(data) {
	slack.sendMessage('back function not yet ready', data.channel);
}
