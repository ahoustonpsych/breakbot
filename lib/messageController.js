let slack = require('./slack').rtm;
let commands = require('../commands');
let topic = require('../commands/topic');
let conf = require('../conf/config');

exports.handle = function (data) {

    //ignore self and slackbot
    if (!!commands && data.user !== 'USLACKBOT' && data.user !== slack.getUser('breakbot').id) {
        //handle normal messages
        let message = data.text;
        commands.forEach((command) => {
            if (command.expr.test(message)) {
                messageArr = message.split(' ');
                if (messageArr[0].match(/breakbot/i)) {
                    messageArr.shift();
                }
                messageArr.shift();
                data.text = messageArr.join(' ');
                command.run(data);
            }
        });
    }
};
