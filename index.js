
var slack = require('./lib/slack').rtm;
var web = require('./lib/slack').web;

var conf = require('./conf/config');

var messageController = require('./lib/messageController');
var db = require('./lib/database');
var topic = require('./commands/topic');

var breaks = require('./commands/breaks');

var server = require('./lib/api');

var upkeep = require('./lib/upkeep').upkeep;


slack.on('authenticated', function (data) {

    //dumb slack stuff
    if (conf.ENV === 'dev')
        //private channels
        data.groups.forEach(function (chan) {
            if (chan.name === conf.channel[conf.ENV])
                topic.topic = chan.topic.value;
        });

    else
        //public channels
        data.channels.forEach(function (chan) {
            if (chan.name === conf.channel[conf.ENV])
                topic.topic = chan.topic.value;
        });
});

/* always listening */
slack.on('message', function (data) {
    if (slack.dataStore.getChannelGroupOrDMById(data.channel).name === conf.channel[conf.ENV])
        messageController.handle(data);
});

function main() {

    db.initdb();

    server.initserver();

    /* runs upkeep every second */
    setInterval(upkeep, 1000);
}

/* run */
if (require.main === module)
    main();