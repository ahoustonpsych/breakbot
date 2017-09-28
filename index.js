
var slack = require('./lib/slack').rtm;

var conf = require('./conf/config');

var globals = require('./conf/config.globals');

var messageController = require('./lib/messageController');
var db = require('./lib/database');
var server = require('./lib/api');
var upkeep = require('./lib/upkeep').upkeep;

var topic = require('./commands/topic');
var breaks = require('./commands/breaks');
//var wrapup = require('./commands/wrapup');

module.exports = {
    startProcessing: startProcessing
};


slack.on('authenticated', function (data) {

    //TODO
    //set topics for all channels when joined
    // if (isApprovedChannel(data))
    //     //create channel objs
    //     topic.topic = chan.topic.value;

});

/* always listening */
slack.on('message', function (data) {


    //ignore own messages
    //TODO fix this
    if (slack.dataStore.getUserById(data.user).name === 'breakbot.sftest')
        return false;

    //console.log(data)

    startProcessing(data);

});

/* throw error if slack dies */
slack.on('disconnect', data => {
    console.error('**************SLACK DIED**************');
    console.error(new Date());
    throw new Error(data);
});

function startProcessing(data) {
    //console.log('startProcessing data: ' + data)
    let rawChannel = slack.dataStore.getChannelGroupOrDMById(data.channel);
    //console.log(rawChannel);

    //add plaintext channel name to message object, for reference later
    data.name = rawChannel.name;

    if (!isApprovedChannel(rawChannel.name))
        return false;

    updateChannelInfo(rawChannel);

    //update topic
    if (data.hasOwnProperty('subtype'))
        if (data.subtype === 'group_topic' || data.subtype === 'channel_topic') {
            //console.log(data)
            globals[rawChannel.name].topic = data.topic;
            // console.log('updating topic')
            // console.log('data topic: ' + data.topic)
        }

    //console.log(globals[rawChannel.name]);

    messageController.handle(data);
}

function updateChannelInfo(channel) {

    //console.log('channel name: ' + channel.name);

    if (globals.hasOwnProperty(channel.name)) {
        //update topic if global channel object exists
        //globals[channel.name].topic = channel.topic.value;
        return false;
    }

    //global channel object
    globals[channel.name] = {
        name: channel.name,
        id: channel.id,
        topic: channel.topic.value,
        //TODO
        //make sure not to overwrite this data during restart
        schedule: {},
        breaks: {
            active: {},
            bio: {},
            lunch: {},
            out: {},
            over: {},
            meeting: {},
            clearBreaks: clearBreaks
        }

    };
}

//delete all breaks for a user
function clearBreaks(user, channel) {
    delete globals[channel].breaks.active[user];
    delete globals[channel].breaks.over[user];
    delete globals[channel].breaks.lunch[user];
    delete globals[channel].breaks.bio[user];
}

/*
 * Returns true if we're in an approved channel
 */
function isApprovedChannel(channelName) {

    return conf.channels.indexOf(channelName) !== -1;

    /* dumb slack stuff. functions are different for public and private channels */
        /* private channels */
    // conf.channels.forEach(function (validChan) {
    //     console.log(channelName, validChan);
    //     if (channelName == validChan)
    //         return true;
    // });

    // if (conf.ENV === 'dev')
    //     return conf.channels.indexOf(channelName) !== -1;
    //     /* public channels */
    // else
    //     return conf.channels.indexOf(channelName) !== -1;

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