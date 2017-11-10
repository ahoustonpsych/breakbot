let conf_breaks = require('../conf/config.breaks');

function Channel(ch) {
    //console.log('constructor');

    this.name = ch.name;
    this.id = ch.id;
    this.topic = ch.topic.value;
    //TODO
    //make sure not to overwrite this data during restart
    this.schedule = {};
    this.punches = {};
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
        cooldown: {}
    };
    this.increaseBreakCount = (user) => {
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
            console.error(new Date().toLocaleString() + ' BAD BREAK COUNT:');
            console.error(this.breaks.count);
        }
    };
    this.clearBreaks = (user) => {
        delete this.breaks.active[user];
        delete this.breaks.over[user];
        delete this.breaks.lunch[user];
        delete this.breaks.bio[user];
    };
    //TODO
    this.updateBreaks = (user, type, expireTime) => {
        let now = new Date().getTime();
        this.clearBreaks(user);
        switch(type) {
            case 'brb':
                //TODO
                this.breaks.active[user] = {
                    outTime: now,
                    duration: new Date(),
                    channel: this.name,
                    remaining: new Date,

                };
                break;
            case 'lunch':

                break;
            case 'bio':
                break;
            case 'task':
                break;
        }
    }
}

module.exports = Channel;