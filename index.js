
let slack = require('./lib/slack').rtm;

let conf = require('./conf/config');
let conf_breaks = require('./conf/config.breaks');

//let globs = require('./conf/config.globals');
//let globals = {};
let globals = require('./conf/config.globals');

let messageController = require('./lib/messageController');
let db = require('./lib/database');
let server = require('./lib/api');
let upkeep = require('./lib/upkeep').upkeep;

let topic = require('./commands/topic');
let breaks = require('./commands/breaks');

let adp = require('./lib/adp');
let Channel = require('./lib/channels');
//let wrapup = require('./commands/wrapup');

module.exports = {
    startProcessing: startProcessing
    //initChannel: initChannel
};


slack.on('authenticated', function (data) {
    console.log(new Date().toLocaleString() + ' authenticated to slack');

    /* init channel objects */
    data.channels.forEach((chan) => {
        if (chan.is_member) {
            if (!isApprovedChannel(chan.name))
                return false;
            let rawChannel = slack.dataStore.getChannelGroupOrDMById(chan.id);
            globals.channels[rawChannel.name] = new Channel(rawChannel)
        }
    });

    data.groups.forEach((chan) => {
        if (!isApprovedChannel(chan.name))
            return false;
        let rawChannel = slack.dataStore.getChannelGroupOrDMById(chan.id);
        globals.channels[rawChannel.name] = new Channel(rawChannel)
    });

    adp.getPunchedIn();

    //TODO
    //set topics for all channels when joined
    // if (isApprovedChannel(data))
    //     //create channel objs
    //     topic.topic = chan.topic.value;

    // conf.channels.forEach(function (chan) {
    //     globals.channels[chan] = require('./conf/config.globals');
    // });

});

/* always listening */
slack.on('message', function (data) {

    if (!isApprovedChannel(slack.dataStore.getChannelGroupOrDMById(data.channel).name))
        return false;

    if (!!data.user)
        return false;

    //ignore own messages
    //TODO fix this
    if (slack.getUser(data.user).name === 'breakbot.sftest')
        return false;

    //console.log(globals.channels['breakbot-support']);

    startProcessing(data);

});

/* throw error if slack dies */
slack.on('disconnect', data => {
    console.error(new Date().toLocaleString() + ' **************SLACK DIED**************');
    throw new Error(data);
});

function startProcessing(data) {
    //console.log('startProcessing data: ' + data)
    let rawChannel = slack.dataStore.getChannelGroupOrDMById(data.channel);

    //add plaintext channel name to message object, for reference later

    if (!slack.getUser(data.user) instanceof Object)
        return false;

    data.name = rawChannel.name;

    //add plaintext user name to message object, for reference later
    data.username = slack.getUser(data.user).name; //profile.email.split('@')[0];

    //initChannel(rawChannel);

    //update topic
    if (data.hasOwnProperty('subtype'))
        if (data.subtype === 'group_topic' || data.subtype === 'channel_topic') {
            //console.log(data)
            globals.channels[rawChannel.name].topic = data.topic;
            // console.log('updating topic')
            // console.log('data topic: ' + data.topic)
        }

    //console.log(globals.channels[rawChannel.name]);

    messageController.handle(data);
}

/*
 * Returns true if we're in an approved channel
 */
function isApprovedChannel(channelName) {
    // console.log(channelName);
    // console.log(conf.channels.indexOf(channelName));
    // console.log(conf.channels);
    return conf.channels.indexOf(channelName) !== -1;
}

function isPrivateMessage(msg) {
    return msg.channel.slice(0,1) === 'D';
}

function main() {

    db.initdb();

    server.initserver();

    //breaks.restoreBreaks();

    //wrapup.restoreWrapup();

    /* runs upkeep every second */
    setInterval(upkeep, 1000);
}

/* run */
if (require.main === module)
    main();