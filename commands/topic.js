let web = require('../lib/slack').web;
let slack = require('../lib/slack').rtm;

let globals = require('../conf/config.globals');

/*
 * global var used to represent the current topic
 */
let topic = '';
let _notifytopic = '';
let captains = [];

/*
 * topic handler
 */
module.exports = {
    topic: topic,
    _notifytopic: _notifytopic,
    captains: captains,
    //maybe remove
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
    //maybe remove
    getCaptains: function () {

        if (!(this.captains instanceof Array))
            return false;

        return this.captains;

    },
    setTopic: function (chanObj, topic) {

        //topic = globals.channels[chanObj.name].topic + ' ' + newtopic;
        /* private channels */
        if (chanObj.channel[0] === 'G')
            web.groups.setTopic(chanObj.channel, topic);

        /* public channels */
        else
            web.channels.setTopic(chanObj.channel, topic);

        globals.channels[chanObj.name].topic = topic;

    },
    getChatters: function (chan) {
        return cleanTopic(globals.channels[chan].topic);
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
        .filter(function (el) { return el !== '' && slack.dataStore.getUserByName(el) instanceof Object; });
}