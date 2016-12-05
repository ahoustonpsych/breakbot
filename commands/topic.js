
var web = require('../lib/slack').web;

/*
 * global var used to represent the current topic
 */
var topic = '';

/*
 * topic handler
 */
module.exports = {
    topic: topic,
    setTopic: function (channel, newtopic) {
        web.groups.setTopic(channel, newtopic);
        this.topic = newtopic;
    }
};