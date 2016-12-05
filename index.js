var messageController = require('./lib/messageController');

var slack = require('./lib/slack').rtm;

slack.on('message', function(data) {
	messageController.handle(data);
});
