var commands = require('../commands');

//console.log("commands:");
//commands.forEach(function(command) {console.log(command.expr);});

exports.handle = function(data) {

	//ignore slackbot
	if(!!commands && data.user !== 'USLACKBOT') {
		var message = data.text;

		commands.forEach(function(command) {
			if(command.expr.test(message)) {
				command.run(data);
			}
		});
	}
};
