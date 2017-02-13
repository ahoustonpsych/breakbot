var web = require('../lib/slack').web;

/*
 * global var used to represent the current topic
 */
var topic = '';
var _notifytopic = '';
var captains = [];

/*
 * topic handler
 */
module.exports = {
    topic: topic,
    _notifytopic: _notifytopic,
    captains: captains,
    setCaptains: function () {

        if (conf.ENV === 'dev')
            console.log('setting topic: ' + this._notifytopic);

        if (typeof(this._notifytopic) !== 'string')
            return false;

        else
            this.captains = cleanTopic(this._notifytopic)
                .map(function (name) {
                    return name.toLowerCase();
                })

    },
    getCaptains: function () {

        if (!(this.captains instanceof Array))
            return false;

        return this.captains;

    },
    setTopic: function (channel, newtopic) {

        /* private channels */
        if (channel[0] === 'G')
            web.groups.setTopic(channel, newtopic);

        /* public channels */
        else
            web.channels.setTopic(channel, newtopic);

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