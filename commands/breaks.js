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

    let that = this;

    return new Promise(function (fulfill, reject) {

        /* all break data */
        let breakdata = JSON.stringify(that.active) + '\n' +
            JSON.stringify(that.over) + '\n' +
            JSON.stringify(that.task) + '\n' +
            JSON.stringify(that.lunch) + '\n' +
            JSON.stringify(that.bio) + '\n' +
            JSON.stringify(luncher.schedule);

        if (breakdata !== undefined) {
            fs.writeFileSync(conf.restore.savefile, breakdata);
            fulfill('success');
        }

        else reject('empty break data somehow: ' + breakdata);

    });
}

function restoreBreaks() {

    let that = this;

    fs.readFile(conf.restore.savefile, 'utf8', function (err,res) {

        if (err) console.error('not found');

        else if (!res) {
            console.log('no break data in file');
        }

        else {

            let rawbreaks = res.split('\n');

            breakdata = '{}\n{}\n{}\n{}\n{}\n{}';

            that.active = JSON.parse(rawbreaks[0]);
            that.over = JSON.parse(rawbreaks[1]);
            that.task = JSON.parse(rawbreaks[2]);
            that.lunch = JSON.parse(rawbreaks[3]);
            that.bio = JSON.parse(rawbreaks[4]);

            luncher.schedule = JSON.parse(rawbreaks[5]);

            //return if lunch schedule is empty
            if (luncher === {})
                return;

            //restore lunch times to date objects
            Object.keys(luncher.schedule).forEach(function (user) {
                luncher.schedule[user].time = new Date(luncher.schedule[user].time);
            });

            if (breakdata !== undefined) {
                fs.writeFileSync(conf.restore.savefile, breakdata);
            }

        }
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

    if (!(breaks.increaseBreakCount(user))) {
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