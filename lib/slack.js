var RtmClient = require('@slack/client').RtmClient;
var WebClient = require('@slack/client').WebClient;

var MemoryDataStore = require('@slack/client').MemoryDataStore;

var config = require('../conf/config');

var rtm = new RtmClient(config.slackAPIKey, {
    logLevel: config.loglevel,
    dataStore: new MemoryDataStore()
});

var web = new WebClient(config.slackAPIKey);

rtm.start();

exports.rtm = rtm;
exports.web = web;