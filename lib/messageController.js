var commands = require('../commands');
var topic = require('../commands/topic');

exports.handle = function (data) {

    //ignore self and slackbot
    if (!!commands && data.user !== 'USLACKBOT' && data.user !== 'U2KASR2FN') {

        //handle topic changes
        try {
            if (data.topic) {
                topic.topic = data.topic;
                return;
            }
        }
        catch (e) {
            //no topic change, proceed normally
        }

        //handle normal messages
        var message = data.text;
        commands.forEach(function (command) {
            if (command.expr.test(message)) {
                command.run(data);
            }
        });
    }
};
