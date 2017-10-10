
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
//let wrapup = require('./commands/wrapup');

module.exports = {
    startProcessing: startProcessing,
    initChannel: initChannel
};


slack.on('authenticated', function (data) {

    data.channels.forEach((chan) => {
        if (chan.is_member)
            initChannel(chan)
    });
    //console.log(data.groups)
    data.groups.forEach((chan) => {
        initChannel(chan);
    });

    adp.getPunchedIn();

});

/* always listening */
slack.on('message', function (data) {

    //ignore own messages
    //TODO fix this
    if (slack.dataStore.getUserById(data.user).name === 'breakbot.sftest')
        return false;

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

    //add plaintext channel name to message object, for reference later
    data.name = rawChannel.name;

    //add plaintext user name to message object, for reference later
    data.username = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];

    if (!isApprovedChannel(rawChannel.name))
        return false;

    initChannel(rawChannel);

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

//TODO
function initChannel(channel) {

    if (globals.hasOwnProperty(channel.name))
        return false;

    //globals[channel.name] = new globals.Channel(channel.name, channel.id, channel.topic.value);
    //console.log('name: ' + channel.name);

    //global channel object
    globals[channel.name] = {
        name: channel.name,
        id: channel.id,
        topic: channel.topic.value,
        //TODO
        //make sure not to overwrite this data during restart
        schedule: {},
        punches: {},
        punchCount: 0,
        maxOnBreak: 5,
        breaks: {
            active: {},
            bio: {},
            lunch: {},
            task: {},
            over: {},
            //meeting: {},
            count: {},
            cooldown: {},
            increment: increaseBreakCount,
            clearBreaks: clearBreaks
        }
    };
}

/* delete all breaks for a user (except for tasks) */
function clearBreaks(user, channel) {
    delete globals[channel].breaks.active[user];
    delete globals[channel].breaks.over[user];
    delete globals[channel].breaks.lunch[user];
    delete globals[channel].breaks.bio[user];
}

/* increments user's break count for the day */
function increaseBreakCount(user, channel) {
    if (globals.hasOwnProperty(channel)) {
        if (!(globals[channel].breaks.count.hasOwnProperty(user))) {
            globals[channel].breaks.count[user] = 1;
            return true;
        }
        else if (globals[channel].breaks.count[user] < conf_breaks.maxDailyBreaks) {
            globals[channel].breaks.count[user] += 1;
            return true;
        }
        else if (globals[channel].breaks.count[user] === conf_breaks.maxDailyBreaks) {
            console.log(new Date().toLocaleString() + ' ' + user + ' exceeded maximum daily breaks');
            return false;
        }
        else {
            console.error('BAD BREAK COUNT:');
            console.error(globals[channel].breaks.count);
        }
    }
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