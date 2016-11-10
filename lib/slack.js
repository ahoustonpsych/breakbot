var RtmClient = require('@slack/client').RtmClient;
var config = require('../config');
var MemoryDataStore = require('@slack/client').MemoryDataStore;

var rtm = new RtmClient(config.slackAPIKey, {
	logLevel: config.loglevel,
	dataStore: new MemoryDataStore()
});

rtm.start();

module.exports = rtm;
