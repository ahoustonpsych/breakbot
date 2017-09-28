let RtmClient = require('@slack/client').RtmClient;
let WebClient = require('@slack/client').WebClient;

let MemoryDataStore = require('@slack/client').MemoryDataStore;

let config = require('../conf/config');

let rtm = new RtmClient(config.slackAPIKey, {
    logLevel: config.loglevel,
    dataStore: new MemoryDataStore()
});

/* send DM to user */
rtm.sendPrivateMessage = function (text, userId) {
    web.im.open(userId)
        .then(function (res) {
            let userDM = res.channel.id;
            rtm.sendMessage(text, userDM);
        })
        .catch(function (err) {
            console.error('ERROR OPENING DM: ', err);
        });
};

let web = new WebClient(config.slackAPIKey);

rtm.start();

exports.rtm = rtm;
exports.web = web;