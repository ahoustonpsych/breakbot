let slack = require('../../lib/slack').rtm;

let globals = require('../../conf/config.globals');
//var breaks = require('../breaks');

let offs = {'!list': 1, 'breakbot': 2};


module.exports = {
    expr: /^(!list)|(breakbot:? list)/i,
    run: list
};

function list(data) {

    let breaks = globals[data.name].breaks;
    //console.log(breaks.active)

    if (data.text.split(' ')[0].match(/^!list/i) !== null)
        off = offs['!list'];
    else
        off = offs['breakbot'];

    let username = slack.dataStore.getUserById(data.user).profile.email.split('@')[0];
    let arg = data.text.split(' ')[off];
    let name = data.text.split(' ')[off+1];

    //!list rm handling
    //removes user from the break lists
    if (typeof(arg) === 'string' && typeof(name) === 'string') {
        if (arg.match(/^rm$/ig) !== null) {

            if (name.match(/^me$/ig) !== null)
                name = username;

            //console.log(name);
            if (breaks.active.hasOwnProperty(name) ||
                breaks.over.hasOwnProperty(name) ||
                breaks.task.hasOwnProperty(name) ||
                breaks.lunch.hasOwnProperty(name) ||
                breaks.bio.hasOwnProperty(name)) {

                //TODO
                //log this
                delete breaks.task[name];
                breaks.clearBreaks(name, data.name);
                slack.sendMessage('removed from break list: ' + name, data.channel);
                console.log(new Date().toLocaleString() + ' removed breaks for: ' + name + ' in channel: ' + data.name);
                return true;
            }

            else {
                slack.sendMessage('not in any list: ' + name, data.channel);
                return false;
            }
        }
    }

    let onbreak_list = '*On break:* ';
    let lunch_list = '*On lunch:* ';
    let task_list = '*On task:* ';
    let bio_list = '*Bathroom:* ';

    /* populates list of users currently on break, paired with the amount of time left on their break */
    if (Object.keys(breaks.active).length !== 0)
        Object.keys(breaks.active).forEach((user) => {
            onbreak_list = onbreak_list + user + ' (' + breaks.active[user].remaining + 'm), ';
        });

    if (Object.keys(breaks.lunch).length !== 0)
        Object.keys(breaks.lunch).forEach((user) => {
            lunch_list = lunch_list + user + ' (' + breaks.lunch[user].remaining + 'm), ';
        });

    if (Object.keys(breaks.bio).length !== 0)
        Object.keys(breaks.bio).forEach((user) => {
            bio_list = bio_list + user + ' (' + breaks.bio[user].remaining + 'm), ';
        });

    if (Object.keys(breaks.task).length !== 0)
        Object.keys(breaks.task).forEach((user) => {
            task_list = task_list + user + ' (' + breaks.task[user].remaining + 'm), ';
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
    if (Object.keys(breaks.active).length !== 0)
        list += onbreak_list + '\n';

    if (Object.keys(breaks.over).length !== 0)
        list += '*Over break:* ' +  Object.keys(breaks.over).join(', ') + '\n';

    if (Object.keys(breaks.task).length !== 0)
        list += '*Out:* ' + Object.keys(breaks.task).join(', ') + '\n';

    if (Object.keys(breaks.lunch).length !== 0)
        list += lunch_list + '\n';

    if (Object.keys(breaks.bio).length !== 0)
        list += bio_list + '\n';
    */

    if (Object.keys(breaks.active).length !== 0 ||
        Object.keys(breaks.over).length !== 0 ||
        Object.keys(breaks.task).length !== 0 ||
        Object.keys(breaks.lunch).length !== 0 ||
        Object.keys(breaks.bio).length !== 0) {

        slack.sendMessage(onbreak_list + '\n' +
            '*Over break:* ' + Object.keys(breaks.over).join(', ') + '\n' +
            task_list + '\n' +
            lunch_list + '\n' +
            bio_list, data.channel);
    }
    else {
        slack.sendMessage('Nobody on break', data.channel);
    }

}