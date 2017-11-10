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
    restoreBreaks: restoreBreaks
};

//TODO
//fix break save/restore
function saveBreaks() {

    //let that = this;

    //console.log(JSON.stringify(globals));

    return new Promise(function (fulfill, reject) {

        let globalsSnapshot = JSON.stringify(globals);

        /* all break data */
        if (globalsSnapshot !== undefined) {
            fs.writeFileSync(conf.restore.savefile, globalsSnapshot);
            fulfill('success');
        }

        else reject(globalsSnapshot);

    });
}

function restoreBreaks() {

    fs.readFile(conf.restore.savefile, 'utf8', (err,res) => {

        if (err) {
            console.error(new Date().toLocaleString() + ' save file not found: ' + conf.restore.savefile);
            console.error(err);
        }

        else if (!res || res === '{}') {
            console.log(new Date().toLocaleString() + ' no break data in file');
            console.log(res);
            return;
        }

        let parsed = JSON.parse(res);

        //for each channel obj
        Object.keys(parsed.channels).forEach((chan) => {

            globalChanObj = globals.channels[chan];
            parsedChanObj = parsed.channels[chan];

            Object.keys(parsedChanObj).forEach((key) => {
                if (key === 'schedule') return;
                globalChanObj[key] = parsedChanObj[key];
            });

            //for each lunch slot obj
            Object.keys(parsedChanObj.schedule).forEach((slot) => {
                //for each scheduled lunch el
                for (slotIdx in parsedChanObj.schedule[slot]) {
                    if (parsedChanObj.schedule[slot][slotIdx] === null)
                        continue;

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

function isOnBreak(user, channel) {
    return !!globals.channels[channel].breaks.active[user]
    || !!globals.channels[channel].breaks.task[user]
    || !!globals.channels[channel].breaks.bio[user]
    || !!globals.channels[channel].breaks.over[user]
    || !!globals.channels[channel].breaks.lunch[user];
}

function canTakeBreak(user, channel) {

    let chanId = slack.dataStore.getChannelOrGroupByName(channel).id;
    breaks = globals.channels[channel].breaks;

    if (isOnBreak(user, channel)) {
        slack.sendMessage('err: already on break', chanId);
        return false;
    }

    if (breaks.cooldown.hasOwnProperty(user)) {
        let rem = new Date().getTime() - breaks.cooldown[user].getTime(); // milliseconds
        rem = Math.ceil(Math.abs(rem / 60 / 1000));
        slack.sendMessage('err: too soon since last break (' + rem + 'm remaining)', chanId);
        return false;
    }

    if (!(globals.channels[channel].increaseBreakCount(user))) {
        slack.sendMessage('err: hit daily break limit (' + conf_breaks.maxDailyBreaks + ')', chanId);
        return false;
    }

    if (!slotAvailable(channel)) {
        slack.sendMessage('err: too many people on break. check !list', chanId);
        return false;
    }

    /* reject if eos is near */
    // if (!globals.channels[channel].punches[user].punched_eos) {
    //     slack.sendMessage('err: too close to eos', chanId);
    //     return false;
    // }

    return true;
}

/* returns true if there's a break opening in channel */
function slotAvailable(channel) {

    let breaks = globals.channels[channel].breaks;

    let totalOut =
        Object.keys(breaks.active).length +
        //Object.keys(breaks.bio).length +
        //Object.keys(breaks.lunch).length +
        //Object.keys(breaks.task).length +
        Object.keys(breaks.over).length;

    //console.log(totalOut);

    let max = globals.channels[channel].maxOnBreak > 1 ? globals.channels[channel].maxOnBreak : conf_breaks.maxOnBreak;

    return totalOut < max;
}