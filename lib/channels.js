const _ = require('lodash');
let conf_breaks = require('../conf/config.breaks');
let conf = require('../conf/config');
let slack = require('../lib/slack').rtm;
let Helpers = require('./helpers');
let Promise = require('promise');
let db = require('./database');

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

    isSuper(name) {
        return new Promise((fulfill, reject) => {
            //temporary hardcoding
            let supers = [
                'jlangfeldt',
                'acwilliams',
                'cfisher',
                'mrathbun',
                'dsinger',
                'jankney',
                'tdevlin',
                'ldunn',
                'rjones',
                'cburt',
                'wvallence', //TODO REMOVE
                'rbodary',
                'tdolliver',
                'scharteris',
                'ahouston'
            ];

            return supers.indexOf(name) > -1 ? fulfill() : reject();

            // for (let i=0; i<this.supervisors.length; i++) {
            //     if (this.supervisors[i].username === name) {
            //         fulfill();
            //     }
            //     else if (i >= this.supervisors.length-1) {
            //         reject();
            //     }
            // }

            // let query = `SELECT title FROM punch_history WHERE username = '${name}' ORDER BY username LIMIT 1`,
            //     regTitles = new RegExp('Supervisor|Manager', 'i');
            //
            // //if (name === 'ahouston') fulfill('ahouston used task');
            //
            // db.queryDB(query)
            //     .then(res => {
            //         if (res[0].title.match(regTitles))
            //             fulfill();
            //         else
            //             reject();
            //     })
            //     .catch(err => reject(err));
        });
    }

    /*
     * returns the active break type for "user"
     * or undefined if they're not on break
     */
    isOnBreak(user) {
        return _.findKey(this.breaks, user);
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
    updateBreaks(user, type, duration) {
        return new Promise((fulfill, reject) => {
            let now = new Date().getTime(),
                onbreak = this.isOnBreak(user); // type

            if (onbreak) { // if on break
                if (onbreak !== type) { //
                    //different break
                    this.clearBreaks(user); // clear existing break
                    delete this.breaks.task[user];
                } else {
                    this.breaks[type][user].duration += duration;
                    this.breaks[type][user].remaining += duration;
                    fulfill('updated break for: ' + user);
                }
            }

            //existing break
            this.breaks[type][user] = { //create new break
                outTime: now,
                duration: duration,
                channel: this.name,
                remaining: duration
            };

            if (!this.breaks[type][user])
                reject('failed to add break');

            fulfill('added break for: ' + user);

            // switch (type) {
            //     case 'brb':
            //         //TODO
            //
            //         // this.breaks.active[user] = {
            //         //     outTime: now,
            //         //     duration: (this.breaks.active[user].duration) += duration,
            //         //     channel: this.name,
            //         //     remaining: new Date,
            //         // };
            //         break;
            //     case 'lunch':
            //
            //         break;
            //     case 'bio':
            //         break;
            //     case 'task':
            //         break;
            // }
        });
    }
}

module.exports = Channel;