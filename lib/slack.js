let RtmClient = require('@slack/client').RtmClient;
let WebClient = require('@slack/client').WebClient;

let MemoryDataStore = require('@slack/client').MemoryDataStore;

let config = require('../conf/config');

let rtm = new RtmClient(config.slackAPIKey, {
    logLevel: config.loglevel,
    dataStore: new MemoryDataStore()
});

let web = new WebClient(config.slackAPIKey);

/* fetch user object */
rtm.getUser = function (ident) {
    if (typeof(ident) !== 'string')
        return undefined;
    return rtm.dataStore.getUserByName(ident.toLowerCase()) || rtm.dataStore.getUserById(ident) || 'not defined';
};

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

rtm.start();

exports.rtm = rtm;
exports.web = web;