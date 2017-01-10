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
        web.groups.setTopic(channel, newtopic);
        this.topic = newtopic;
    },
    getChatters: function () {
        return cleanTopic(this.topic);
    },
    removeSpecial: removeSpecial
};

/*
 * removes special characters from a string
 */
function removeSpecial(str) {
    return str.replace(/[!@#$%^&?*(){}<>\[\]\/\\|_+-=.,`~;:]+/g, '');
}

function cleanTopic(topic) {
    return removeSpecial(topic)
        .replace(/chat(ters)?|cap(('|'n)?|tain)?|back(up)?|lead(er)?/ig, '')
        .split(' ')
        .filter(function (el) { return el !== ''; });
}