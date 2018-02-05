
let slack = require('./lib/slack').rtm;

let conf = require('./conf/config');
let conf_breaks = require('./conf/config.breaks');

let globals = require('./conf/config.globals');

let messageController = require('./lib/messageController');
let db = require('./lib/database');
let server = require('./lib/api');
let upkeep = require('./lib/upkeep').upkeep;

let topic = require('./commands/topic');
let breaks = require('./commands/breaks');

let adp = require('./lib/adp');
let Channel = require('./lib/channels');

module.exports = {
    startProcessing: startProcessing
};


slack.on('authenticated', function (data) {
    console.log(new Date().toLocaleString() + ' authenticated to slack');
    globals.slack = slack;  // global slack obj

    /* init channel objects */
    data.channels.forEach((chan) => {
        if (chan.is_member) {
            if (!isApprovedChannel(chan.name))
                return false;
            let rawChannel = slack.getChannel(chan.id);
            globals.channels[rawChannel.name] = new Channel(rawChannel)
        }
    });

    data.groups.forEach((chan) => {
        if (!isApprovedChannel(chan.name))
            return false;
        let rawChannel = slack.getChannel(chan.id);
        globals.channels[rawChannel.name] = new Channel(rawChannel)
    });

    breaks.restoreBreaks();

    adp.getPunchedIn();

});

/* always listening */
slack.on('message', function (data) {

    //ignore bots
    if (!!data.bot_id)
        return false;

    //ignore edited/deleted messages
    if (!!data.subtype) {
        if (data.subtype === 'message_changed' || data.subtype === 'message_deleted')
            return false;
    }

    //validate message data
    if (!(!!data.user && !!data.text && !!data.channel)) {
        console.error(new Date().toLocaleString() + ' unknown message format! Ignoring:');
        console.error(data);
        return false;
    }

    //only run in valid channels
    if (!isApprovedChannel(slack.getChannel(data.channel).name))
        return false;

    //ignore own messages
    if (slack.getUser(data.user).name === 'breakbot')
        return false;

    //process message
    startProcessing(data);

});

/* throw error if slack dies */
slack.on('disconnect', data => {
    console.error(new Date().toLocaleString() + ' **************SLACK DIED**************');
    breaks.saveBreaks()
        .then(() => { /* TODO restart breakbot */ })
        .catch(err => console.error(new Date().toLocaleString(), 'ERROR SAVING BREAKS AFTER SLACK DIED:', err));
});

function startProcessing(data) {
    let rawChannel = slack.getChannel(data.channel);

    //add plaintext channel name to message object, for reference later
    if (!slack.getUser(data.user) instanceof Object)
        return false;

    data.name = rawChannel.name;

    //add plaintext user name to message object, for reference later
    data.username = slack.getUser(data.user).name; //.profile.email.split('@')[0];

    //update topic
    if (data.hasOwnProperty('subtype')) {
        if (data.subtype === 'group_topic' || data.subtype === 'channel_topic') {
            globals.channels[rawChannel.name].topic = data.topic;
        }
    }

    messageController.handle(data);
}

/*
 * Returns true if we're in an approved channel
 */
function isApprovedChannel(channelName) {
    return conf.channels.indexOf(channelName) !== -1;
}

function isPrivateMessage(msg) {
    return msg.channel.slice(0,1) === 'D';
}

/*
 * start of breakbot
 */
function main() {

    db.initdb();

    server.initserver();

    /* runs upkeep every second */
    setInterval(upkeep, 1000);
}

/* run */
if (require.main === module)
    main();