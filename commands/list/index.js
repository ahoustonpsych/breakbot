var slack = require('../../lib/slack').rtm;
var breaks = require('../breaks');

var offs = {'!list': 1, 'breakbot': 2};


module.exports = {
    expr: /^(!list)|(breakbot:? list)/i,
    run: list
};

function list(data) {

    if (data.text.split(' ')[0].match(/^!list/i) !== null)
        off = offs['!list'];
    else
        off = offs['breakbot'];

    var username = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];
    var arg = data.text.split(' ')[off];
    var name = data.text.split(' ')[off+1];

    //!list rm handling
    //removes user from the break lists
    if (typeof(arg) === 'string' && typeof(name) === 'string') {
        if (arg.match(/^rm$/ig) !== null) {

            if (name.match(/^me$/ig) !== null)
                name = username;

            if (breaks.onbreak.hasOwnProperty(name) ||
                breaks.overbreak.hasOwnProperty(name) ||
                breaks.out.hasOwnProperty(name) ||
                breaks.lunch.hasOwnProperty(name) ||
                breaks.bio.hasOwnProperty(name)) {

                //TODO
                //log this
                delete breaks.out[name];
                breaks.clearBreaks(name);
                slack.sendMessage('removed from break list: ' + name, data.channel);
                return true;

            }
            else {

                slack.sendMessage('not in any list: ' + name, data.channel);
                return false;

            }
        }
    }

    var onbreak_list = '*On break:* ';
    var lunch_list = '*On lunch:* ';
    var bio_list = '*Bathroom:* ';

    /* populates list of users currently on break, paired with the amount of time left on their break */
    if (Object.keys(breaks.onbreak).length !== 0)
        Object.keys(breaks.onbreak).forEach(function (user) {
            onbreak_list = onbreak_list + user + ' (' + breaks.onbreak[user].remaining + 'm), ';
        });

    if (Object.keys(breaks.lunch).length !== 0)
        Object.keys(breaks.lunch).forEach(function (user) {
            lunch_list = lunch_list + user + ' (' + breaks.lunch[user].remaining + 'm), ';
        });

    if (Object.keys(breaks.bio).length !== 0)
        Object.keys(breaks.bio).forEach(function (user) {
            bio_list = bio_list + user + ' (' + breaks.bio[user].remaining + 'm), ';
        });

    /* strips trailing comma from the list */
    onbreak_list = onbreak_list.replace(/, $/, '');
    lunch_list = lunch_list.replace(/, $/, '');
    bio_list = bio_list.replace(/, $/, '');

    /*
    //shelved for now
    //changes !list to only show break types that have any data
    //e.g. it won't show the "on break" list if nobody is on break
    var list = '';
    if (Object.keys(breaks.onbreak).length !== 0)
        list += onbreak_list + '\n';

    if (Object.keys(breaks.overbreak).length !== 0)
        list += '*Over break:* ' +  Object.keys(breaks.overbreak).join(', ') + '\n';

    if (Object.keys(breaks.out).length !== 0)
        list += '*Out:* ' + Object.keys(breaks.out).join(', ') + '\n';

    if (Object.keys(breaks.lunch).length !== 0)
        list += lunch_list + '\n';

    if (Object.keys(breaks.bio).length !== 0)
        list += bio_list + '\n';
    */

    if (Object.keys(breaks.onbreak).length !== 0 ||
        Object.keys(breaks.overbreak).length !== 0 ||
        Object.keys(breaks.out).length !== 0 ||
        Object.keys(breaks.lunch).length !== 0 ||
        Object.keys(breaks.bio).length !== 0) {

        slack.sendMessage(onbreak_list + '\n' +
            '*Over break:* ' + Object.keys(breaks.overbreak).join(', ') + '\n' +
            '*Out:* ' + Object.keys(breaks.out).join(', ') + '\n' +
            lunch_list + '\n' +
            bio_list, data.channel);
    }
    else {
        slack.sendMessage('Nobody on break', data.channel);
    }

}