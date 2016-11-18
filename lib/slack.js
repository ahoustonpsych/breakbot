var RtmClient = require('@slack/client').RtmClient;
var MemoryDataStore = require('@slack/client').MemoryDataStore;

var config = require('../config');

var rtm = new RtmClient(config.slackAPIKey, {
	logLevel: config.loglevel,
	dataStore: new MemoryDataStore()
});

rtm.start();

module.exports = rtm;