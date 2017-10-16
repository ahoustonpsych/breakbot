let slack = require('./slack').rtm;
let commands = require('../commands');
let topic = require('../commands/topic');
let conf = require('../conf/config');

exports.handle = function (data) {

    //ignore self and slackbot
    if (!!commands && data.user !== 'USLACKBOT' && data.user !== 'U2KASR2FN') {
        //handle normal messages
        let message = data.text;
        commands.forEach(function (command) {
            if (command.expr.test(message)) {
                command.run(data);
            }
        });
    }
};
