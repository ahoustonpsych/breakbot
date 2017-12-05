const _ = require('lodash');

let slack = require('../../lib/slack').rtm;

let globals = require('../../conf/config.globals');
let conf_breaks = require('../../conf/config.breaks');
let breaksLib = require('../breaks');

module.exports = {
    expr: /^(!list)|(breakbot:? list)/i,
    run: list,
    getList: buildBreakList
};

function list(data) {

    let chanObj = globals.channels[data.name],
        breaks = chanObj.breaks,
        username = data.username,
        arg = data.text.split(' ')[0],
        name = data.text.split(' ')[1],
        full_list = '';

    //!list rm handling
    //removes user from the break lists
    if (typeof(arg) === 'string' && typeof(name) === 'string') {
        if (arg.match(/^rm$/ig) !== null) {

            if (breaksLib.isMe(arg))
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
                chanObj.clearBreaks(name);
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

    full_list = buildBreakList(data.name);

    slack.sendMessage(full_list, data.channel);

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

}

function buildBreakList(channel) {

    let chanObj = slack.getChannel(channel),
        breaks = globals.channels[chanObj.name].breaks,
        onbreak_list = '*On break:* ',
        lunch_list = '*On lunch:* ',
        task_list = '*On task:* ',
        bio_list = '*Bathroom:* ',
        strTotal = '*Total:* ',
        strMax = '*Max:* ',
        full_list = '',
        max = conf_breaks.maxOnBreak;

    //number of people on break
    total =
        _.size(breaks.active) +
        //Object.keys(breaks.bio).length +
        //Object.keys(breaks.lunch).length +
        _.size(breaks.over);

    //max people on break
    if (globals.channels[chanObj.name].maxOnBreak > 0)
        max = globals.channels[chanObj.name].maxOnBreak;

    if (typeof(total) === 'number')
        strTotal += total;

    if (typeof(max) === 'number')
        strMax += max;

    /* populates list of users currently on break, paired with the amount of time left on their break */
    if (_.size(breaks.active) !== 0)
        Object.keys(breaks.active).forEach((user) => {
            onbreak_list = onbreak_list + user + ' (' + breaks.active[user].remaining + 'm), ';
        });

    if (_.size(breaks.lunch) !== 0)
        Object.keys(breaks.lunch).forEach((user) => {
            lunch_list = lunch_list + user + ' (' + breaks.lunch[user].remaining + 'm), ';
        });

    if (_.size(breaks.bio) !== 0)
        Object.keys(breaks.bio).forEach((user) => {
            bio_list = bio_list + user + ' (' + breaks.bio[user].remaining + 'm), ';
        });

    if (_.size(breaks.task) !== 0)
        Object.keys(breaks.task).forEach((user) => {
            task_list = task_list + user + ' (' + breaks.task[user].remaining + 'm), ';
        });

    /* strips trailing comma from the list */
    onbreak_list = onbreak_list.replace(/, $/, '');
    lunch_list = lunch_list.replace(/, $/, '');
    bio_list = bio_list.replace(/, $/, '');
    task_list = task_list.replace(/, $/, '');

    if (_.size(breaks.active) !== 0 ||
        _.size(breaks.over) !== 0 ||
        _.size(breaks.task) !== 0 ||
        _.size(breaks.lunch) !== 0 ||
        _.size(breaks.bio) !== 0) {

        full_list = onbreak_list + '\n' +
            '*Over break:* ' + Object.keys(breaks.over).join(', ') + '\n' +
            task_list + '\n' +
            lunch_list + '\n' +
            bio_list + '\n' +
            strTotal + ', ' +
            strMax;

        return full_list;

    }
    else {
        return 'Nobody on break';
    }
}