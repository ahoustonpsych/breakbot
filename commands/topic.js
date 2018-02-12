let slack = require('../lib/slack').rtm;
let web = require('../lib/slack').web;

let globals = require('../conf/config.globals');

let topic = '';

/*
 * topic handler
 */
module.exports = {
    topic: topic,
    removeSpecial: removeSpecial,
    setTopic: setTopic,
    getChatters: (chan) => cleanTopic(globals.channels[chan].topic)
};

/*
 * Update topic in current slack channel
 */
function setTopic(chanObj, newTopic) {
    /* private channels */
    if (chanObj.channel[0] === 'G')
        globals.web.groups.setTopic(chanObj.channel, newTopic);

    /* public channels */
    else
        globals.web.channels.setTopic(chanObj.channel, newTopic);

    globals.channels[chanObj.name].topic = newTopic;
}

/*
 * Removes special characters from a string
 */
function removeSpecial(str) {
    if (typeof(str) !== 'string')
        return '';
    return str.replace(/[!@#$%^&?*(){}<>\[\]\/\\|_+\-=.,`~;:'"]+/g, '');
}

/*
 * Removes misc text from topic, returns only a list of valid users
 */
function cleanTopic(topic) {
    return removeSpecial(topic)
        .replace(/chat(ters)?|cap(('|'n)?|tain)?|back(up)?|lead(er)?/ig, '')
        .split(' ')
        .filter(el => el !== '' && globals.slack.isUser(el))
        .map(el => globals.slack.getUser(el).name);
}