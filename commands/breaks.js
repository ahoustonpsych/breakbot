const _ = require('lodash');
let fs = require('fs');

let Promise = require('promise');

let conf = require('../conf/config');
let conf_breaks = require('../conf/config.breaks');
let globals = require('../conf/config.globals');
let luncher = require('./luncher');

let slack = require('../lib/slack').rtm;

let breaks;

module.exports = {
    isOnBreak: isOnBreak,
    canTakeBreak: canTakeBreak,
    slotAvailable: slotAvailable,
    saveBreaks: saveBreaks,
    restoreBreaks: restoreBreaks,
    parseBreakTime: parseBreakTime,
    isMe: isMe
};

/* save all channel/break data */
function saveBreaks() {
    return new Promise(function (fulfill, reject) {
        let globcopy = _.cloneDeep(globals);

        _.each(globcopy.channels, (i,j,k) => delete globcopy.channels[j].meta.cooldownGrace);

        globalsSnapshot = _.attempt(_.partial(JSON.stringify, globcopy));

        // let globalsSnapshot = JSON.stringify(globals);

        /* all break data */
        if (globalsSnapshot !== undefined) {
            fs.writeFileSync(conf.restore.savefile, globalsSnapshot);
            fulfill('success');
        }

        else reject(globalsSnapshot);

    });
}

/* restore all channel/break data, if possible */
function restoreBreaks() {

    fs.readFile(conf.restore.savefile, 'utf8', (err,res) => {

        if (err) {
            console.error(new Date().toLocaleString() + ' save file not found: ' + conf.restore.savefile);
            console.error(err);
        }

        else if (!res || res === '{}') {
            console.log(new Date().toLocaleString() + ' NOTICE: no break data in file');
            console.log(res);
            return;
        }

        let parsed = _.attempt(_.partial(JSON.parse, res));

        /* restore each prop in each channel obj */
        _.each(parsed.channels, (obj, chanName) => {

            globalChanObj = globals.channels[chanName];
            parsedChanObj = parsed.channels[chanName];

            //create cooldownGrace obj (since we deleted it)
            parsedChanObj.meta.cooldownGrace= {};

            //restore schedules separately
            _.each(parsedChanObj, (obj, key) => {
                if (key === 'schedule') return;
                globalChanObj[key] = parsedChanObj[key];
            });

            //for each lunch slot obj
            _.each(parsedChanObj.schedule, (obj, slot) => {
                //for each scheduled lunch el
                for (slotIdx in parsedChanObj.schedule[slot]) {
                    if (parsedChanObj.schedule[slot][slotIdx] === null)
                        continue;

                    /* debug */
                    // console.log('slot:')
                    // console.log(slot)
                    // console.log('slotIdx:')
                    // console.log(slotIdx);
                    // console.log('parsed schedule:')
                    // console.log(parsedChanObj.schedule);

                    if (!(parsedChanObj.schedule[slot][slotIdx].hasOwnProperty('name') ||
                        parsedChanObj.schedule[slot][slotIdx].hasOwnProperty('notified'))) {
                        return;
                    }

                    let name = parsedChanObj.schedule[slot][slotIdx].name,
                        time = new Date(Date.parse(slot)),
                        notified = parsedChanObj.schedule[slot][slotIdx].notified;

                    if (!globalChanObj.schedule.hasOwnProperty(time))
                        globalChanObj.schedule[time] = [];

                    globalChanObj.schedule[time].push({
                        name: name,
                        time: time,
                        notified: notified
                    });
                }
            });
        });

        fs.writeFileSync(conf.restore.savefile, '{}');

    });
}

/*
 * returns the active break type for "user"
 * or undefined if they're not on break
 */
function isOnBreak(user, channel) {
    return _.findKey(globals.channels[channel].breaks, user);

    // return !!globals.channels[channel].breaks.active[user]
    // || !!globals.channels[channel].breaks.task[user]
    // || !!globals.channels[channel].breaks.bio[user]
    // || !!globals.channels[channel].breaks.over[user]
    // || !!globals.channels[channel].breaks.lunch[user];
}

/*
 * Returns true if:
 *  - not already on break
 *  - cooldown hasn't expired
 *  - break slot is available
 *  - daily break limit hasn't been hit
 */
function canTakeBreak(user, channel) {

    let chanId = slack.getChannel(channel).id,
        chanObj = globals.channels[channel],
        breakType = chanObj.isOnBreak(user);

    //reject if on break
    if (breakType) {
        //TODO remove this hack
        if (breakType === 'active') breakType = 'brb';

        slack.sendMessage('err: already on *' + breakType + '*', chanId);
        console.log(new Date().toLocaleString(), `${user} BREAK BLOCKED (already on break)`);
        return false;
    }

    //reject if cooldown hasn't expired
    else if (chanObj.meta.cooldown.hasOwnProperty(user)) {
        let rem = new Date().getTime() - chanObj.meta.cooldown[user].getTime(); // milliseconds
        rem = Math.ceil(Math.abs(rem / 60 / 1000));
        slack.sendMessage(`err: too soon since last break (${rem}m remaining)`, chanId);
        console.log(new Date().toLocaleString(), `${user} BREAK BLOCKED (too soon, ${rem}m remaining)`);
        return false;
    }

    //reject if there's too many people on break
    else if (!slotAvailable(channel)) {
        let totalOnBreak = _.size(chanObj.breaks.active) + _.size(chanObj.breaks.over) + _.size(chanObj.breaks.lunch),
            max = chanObj.maxOnBreak;
        slack.sendMessage(`err: too many people on break (*total:* ${totalOnBreak}, *max:* ${max})`, chanId);
        console.log(new Date().toLocaleString(), `${user} BREAK BLOCKED (too many on break)`);
        return false;
    }

    /* uncomment to reject breaks if eos is near */
    // else if (!globals.channels[channel].punches[user].punched_eos) {
    //     slack.sendMessage('err: too close to eos', chanId);
    //     return false;
    // }

    //reject if daily break limit has been hit
    if (isOverLimit(user, channel)) {
        slack.sendMessage(`err: hit daily break limit (${conf_breaks.maxDailyBreaks})`, chanId);
        console.log(new Date().toLocaleString(), user, 'BREAK BLOCKED (hit daily limit)');
        return false;
    }

    //not over limit
    else {

    }

    return true;
}

/*
 * checks if user is over their daily break limit
 */
function isOverLimit(user, channel) {
    let chanObj = globals.channels[channel];

    if (chanObj.meta.count.hasOwnProperty(user)) {
        return chanObj.meta.count[user] >= conf_breaks.maxDailyBreaks;
    }
    return false;
}

/*
 * Returns true if there's a break opening in channel
 */
function slotAvailable(channel) {

    let breaks, totalOut, max;

    breaks = globals.channels[channel].breaks;

    totalOut =
        _.size(breaks.active) +
        _.size(breaks.over) +
        _.size(breaks.lunch);
        /* uncomment to include other break types when calculating limits */
        // Object.keys(breaks.bio).length +
        // Object.keys(breaks.task).length;

    max = globals.channels[channel].maxOnBreak > 1 ? globals.channels[channel].maxOnBreak : conf_breaks.maxOnBreak;

    return totalOut < max;
}

/*
 * Attempts to determine if "argTime" is a valid break time
 * if not, returns the default break time (5 minutes)
 */
function parseBreakTime(breakType, argTime) {
    return new Promise((fulfill, reject) => {
        let parsed,
            maxTime = breakType === 'task' ? conf_breaks.maxTask : conf_breaks.maxBreak;

        /* reject time if data.breakType isn't valid */
        if (!maxTime) {
            console.error(new Date().toLocaleString() + ' UNKNOWN BREAK TYPE:', breakType);
            reject();
        }

        parsed = parseInt(argTime);

        /* return default break time if it's not provided */
        if (isNaN(parsed)) {
            console.log(new Date().toLocaleString() + " WARNING: COULDN'T PARSE BREAK TIME: " + argTime);
            fulfill(conf_breaks.defaultBreak);
        }

        /* prevents the break time from being negative, zero, or higher than the max time */
        else if ((parsed > maxTime) || (parsed <= 0)) {
            //reject with error
            reject('err: break time out of range *(max: ' + maxTime + ')*');
        }

        /* if all else is good, set break time properly */
        else
            fulfill(parsed);
    });
}

/*
 * Determines if "str" is the string "me"
 * used in commands, mostly
 */
function isMe(str) {
    return !str || str.match(/^me$/i) !== null
}