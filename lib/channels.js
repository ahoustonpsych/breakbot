let conf_breaks = require('../conf/config.breaks');

function Channel(ch) {
    console.log('constructor')

    this.name = ch.name;
    this.id = ch.id;
    this.topic = ch.topic.value;
    //TODO
    //make sure not to overwrite this data during restart
    this.schedule = {};
    this.punches = {

    };
    this.punchCount = 0;
    this.maxOnBreak = 4;
    this.supervisors = [];
    this.breaks = {
        active: {},
        bio: {},
        lunch: {},
        task: {},
        over: {},
        //meeting: {},
        count: {},
        cooldown: {},
        increaseBreakCount: (user) => {
            if (!(this.breaks.count.hasOwnProperty(user))) {
                this.breaks.count[user] = 1;
                return true;
            }
            else if (this.breaks.count[user] < conf_breaks.maxDailyBreaks) {
                this.breaks.count[user] += 1;
                return true;
            }
            else if (this.breaks.count[user] === conf_breaks.maxDailyBreaks) {
                console.log(new Date().toLocaleString() + ' ' + user + ' exceeded maximum daily breaks');
                return false;
            }
            else {
                console.error('BAD BREAK COUNT:');
                console.error(this.breaks.count);
            }
        },
        clearBreaks: (user) => {
            delete this.breaks.active[user];
            delete this.breaks.over[user];
            delete this.breaks.lunch[user];
            delete this.breaks.bio[user];
        }

    };

    // /* increments user's break count for the day */
    // let increaseBreakCount = function (user) {
    //
    // };
    //
    // let clearBreaks = function (user, channel) {
    //
    // };

}



module.exports = Channel;