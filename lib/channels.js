let conf_breaks = require('../conf/config.breaks');
let slack = require('../lib/slack').rtm;
let Helpers = require('./helpers');

class Channel {
    //console.log('constructor');

    constructor(ch) {
        this.name = ch.name;
        this.id = ch.id;
        this.topic = ch.topic.value;
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
        };
        this.meta = {
            count: {},
            cooldown: {},
            cooldownGrace: {}
        }
    }

    isInTopic(user) {
        let userregex = new RegExp(user, 'i');
        console.log(this.topic);
        return this.topic.match(userregex) || 'no match';
    }

    setTopic(newTopic) {
        //TODO this looks silly
        /* private channels */
        if (this.channel[0] === 'G')
            web.groups.setTopic(this.channel, newTopic);

        /* public channels */
        else
            web.channels.setTopic(this.channel, newTopic);

        this.topic = newTopic;
    }

    increaseBreakCount(user) {
        if (!(this.meta.count.hasOwnProperty(user))) {
            this.meta.count[user] = 1;
            return true;
        }
        else if (this.meta.count[user] < conf_breaks.maxDailyBreaks) {
            this.meta.count[user] += 1;
            return true;
        }
        // else if (this.meta.count[user] === conf_breaks.maxDailyBreaks) {
        //     console.log(new Date().toLocaleString(), user, 'exceeded maximum daily breaks');
        //     return false;
        // }
        else {
            console.error(new Date().toLocaleString(), 'BAD BREAK COUNT:', this.meta.count)
        }
    };

    clearBreaks(user) {
        delete this.breaks.active[user];
        delete this.breaks.over[user];
        delete this.breaks.lunch[user];
        delete this.breaks.bio[user];
    };

    //TODO
    updateBreaks(user, type, expireTime) {
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