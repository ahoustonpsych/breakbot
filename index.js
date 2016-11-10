var messageController = require('./lib/messageController');

var slack = require('./lib/slack');

slack.on('message', function(data) {
	messageController.handle(data);
});
