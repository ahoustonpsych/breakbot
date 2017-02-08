var slack = require('./slack').rtm;
var commands = require('../commands');
var topic = require('../commands/topic');
var conf = require('../conf/config');

exports.handle = function (data) {

    //ignore self and slackbot
    if (!!commands && data.user !== 'USLACKBOT' && data.user !== 'U2KASR2FN') {

        //handle topic changes
        try {
            if (data.topic) {
                //main channel topic
                if (slack.dataStore.getChannelGroupOrDMById(data.channel).name === conf.channel[conf.ENV]) {
                    topic.topic = data.topic;
                }
                //captain channel topic
                else if (slack.dataStore.getChannelGroupOrDMById(data.channel).name === conf.notifychannel[conf.ENV]) {
                    topic._notifytopic = data.topic;
                    topic.setCaptains();
                }

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
