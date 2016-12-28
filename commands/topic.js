
var web = require('../lib/slack').web;

/*
 * global var used to represent the current topic
 */
var topic = '';
var captain = '';

/*
 * topic handler
 */
module.exports = {
    topic: topic,
    captain: captain,
    getCaptain: function () {
        this.captain = this.topic.split(' ')[2];
    },
    setTopic: function (channel, newtopic) {
        web.channels.setTopic(channel, newtopic);
        this.topic = newtopic;
    }
};