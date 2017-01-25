
var slack = require('./lib/slack').rtm;

var conf = require('./conf/config');

var messageController = require('./lib/messageController');
var db = require('./lib/database');
var server = require('./lib/api');
var upkeep = require('./lib/upkeep').upkeep;

var topic = require('./commands/topic');
var breaks = require('./commands/breaks');


slack.on('authenticated', function (data) {

    /* dumb slack stuff. commands are different for public and private channels */
    if (conf.ENV === 'dev')
        /* private channels */
        data.groups.forEach(function (chan) {
            if (chan.name === conf.channel[conf.ENV])
                topic.topic = chan.topic.value;
        });

    else
        /* public channels */
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

    breaks.restoreBreaks();

    /* runs upkeep every second */
    setInterval(upkeep, 1000);
}

/* run */
if (require.main === module)
    main();