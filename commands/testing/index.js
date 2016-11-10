var slack = require('../../lib/slack');

module.exports = {
	expr: /^!test/,
	run: function(data) { slack.sendMessage('success', data.channel) }
};

