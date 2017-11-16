
process.env.NODE_ENV = 'test';

let EventEmitter = require('events');
let Promise = require('promise');

let assert = require('assert');
let expect = require('expect.js');
//let sinon = require('sinon');

let slack = require('../lib/slack').rtm;

let bot = require('../index');

let messageController = require('../lib/messageController');
let db = require('../lib/database');

let brb = require('../commands/brb');
let conf = require('../conf/config');
let conf_breaks = require('../conf/config.breaks');

let globals = require('../conf/config.globals');
let Channel = require('../lib/channels');

//var breaks = require('../commands/breaks');

let luncher = require('../commands/luncher');

let resdata = {},
    data = {},
    breaks = {};

let CHANLIST = {
    'breakbot-livechat': 'G74BBPJ7R',
    'breakbot-support': 'C72K0RVK2',
    'breakbot-windows': 'G738QKPJN',
    'breakbot_test': 'G2L3YRUEP',
};

/* set up test channels */
conf.channels = Object.keys(CHANLIST);
conf.channelDesignation = {
    livechat: 'breakbot-livechat',
    support: 'breakbot-support'
};

function overrides() {

    db.log = (table, data) => {};

    slack.sendMessage = function (str, chan) {

        resdata = {
            message: str,
            channel: chan
        };

        emitter.emit('sendMessage', resdata);
    };

    slack.sendPrivateMessage = function (str, user) {

        resdata = {
            message: str,
            user: user
        };

        emitter.emit('sendPrivateMessage', resdata);
    };

}

function freshMock(chan) {

    if (!(globals.channels.hasOwnProperty(chan)))
        return;

    globals.channels[chan] = new Channel({
        name: chan,
        id: slack.dataStore.getChannelOrGroupByName(chan).id,
        topic: { value: '' }
    });

    // globals.channels[chan].breaks.active = {};
    // globals.channels[chan].breaks.bio = {};
    // globals.channels[chan].breaks.over = {};
    // globals.channels[chan].breaks.lunch = {};
    // globals.channels[chan].breaks.task = {};
    // globals.channels[chan].breaks.count = {};

}

function freshMessage() {

    data = {
        type: 'message',
        name: 'breakbot-support',
        channel: CHANLIST['breakbot-support'],
        user: 'U0C01D3AP',
        text: '',
        ts: '1487284354.051638',
        team: 'T024FSSFY'
    };

}

function createBreak(name, channel, type, time) {
    globals.channels[channel].breaks[type][name] = {
        outTime: new Date().getTime(), //new Date().getTime() + time * 60 * 1000,
        duration: time,
        channel: CHANLIST[channel],
        remaining: time
    };
}

function addLunchSlot(name, channel, time) {
    return new Promise(function (fulfill, reject) {
        if (!globals.channels[channel].schedule.hasOwnProperty(time))
            globals.channels[channel].schedule[time] = [];

        globals.channels[channel].schedule[time].push({
            name: name,
            time: time,
            notified: 0
        });
        fulfill();
    });
}

freshMessage();

describe('Commands', function () {

    before(function (done) {
        slack.on('open', () => {
            overrides();
            done();
        });
    });

    beforeEach(function (done) {
        res = {};
        //data.text = '';
        freshMessage();
        if (globals.channels.hasOwnProperty('breakbot-support')) {
            freshMock('breakbot-support');
        }
        done();
    });

    describe('!brb', function () {

        beforeEach(function (done) {
            emitter = new EventEmitter();
            done();
        });

        after(function (done) {
            done();
        });

        describe('no time given', function () {
            it('should set ahouston on break for 5 minutes', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set break for ahouston for 5 minutes.',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!brb';
                bot.startProcessing(data);
            });
        });

        describe('10 minute break', function () {
            it('should set ahouston on break for 10 minutes', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set break for ahouston for 10 minutes.',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });
                data.text = '!brb 10';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('0 minute break', function () {
            it('should reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'err: break time out of range *(max: 15)*',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!brb 0';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('negative minute break', function () {
            it('reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'err: break time out of range *(max: 15)*',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!brb -20';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('150 minute break', function () {
            it('should reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'err: break time out of range *(max: 15)*',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!brb 150';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('non-numerical minute break', function () {
            it('should set ahouston on break for 5 minutes', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set break for ahouston for 5 minutes.',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!brb asdf!@#$"` abc';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('"me" argument', function () {
            it('should set ahouston on break for 5 minutes', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set break for ahouston for 5 minutes.',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!brb me';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('"me" argument with time', function () {
            it('should set ahouston on break for 10 minutes', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set break for ahouston for 10 minutes.',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!brb me 10';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('extra arguments', function () {
            it('should set ahouston on break for 5 minutes', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set break for ahouston for 5 minutes.',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!brb 5 break';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('alternate command syntax', function () {
            it('should set ahouston on break for 10 minutes', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set break for ahouston for 10 minutes.',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = 'breakbot brb 10';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

    });

    describe('!task', function () {

        beforeEach(function (done) {
            emitter = new EventEmitter();
            breaks.task = {};
            done();
        });

        describe('no arguments', function () {
            it('should reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'err: no time or reason given. syntax: *!task [user] [time] [reason]*',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!task';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('valid user, no time or reason', function () {
            it('should reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'err: no time or reason given. syntax: *!task [user] [time] [reason]*',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!task bnewman';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('invalid user', function () {
            it('should reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'err: invalid time. syntax: *!task [user] [time] [reason]*',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!task abcde!#@';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('time given, no reason', function () {
            it('should reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'err: no reason given. syntax: *!task [user] [time] [reason]*',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!task 30';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('time and reason given', function () {
            it('should put ahouston on task', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Put ahouston on task for 30 minutes. Please use *!back* to log back in when you are done',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!task 30 meeting';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('different user, time and reason given', function () {
            it('should put bnewman on task', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Put bnewman on task for 30 minutes. Please use *!back* to log back in when you are done',
                        channel: CHANLIST['breakbot-support']
                    });
                    //console.log(globals.channels['breakbot-support'].breaks)
                    //expect(globals.channels['breakbot-support'].breaks.task).to.have.property('bnewman');
                    //expect(globals.channels['breakbot-support'].breaks.task['bnewman']).to.be.an(Object);
                    done();
                });

                data.text = '!task bnewman 30 meeting';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('excessive time given', function () {
            it('should reject with error', (done) => {
                emitter.on('sendMessage', (res) => {
                    expect(res).to.eql({
                        message: 'err: break time out of range *(max: 120)*',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!task 130 meeting';
                bot.startProcessing(data);
            });
        });

        describe('negative time given', function () {
            it('should reject with error', (done) => {
                emitter.on('sendMessage', (res) => {
                    expect(res).to.eql({
                        message: 'err: break time out of range *(max: 120)*',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!task -30 meeting';
                bot.startProcessing(data);
            });
        });

        describe('zero time given', function () {
            it('should reject with error', (done) => {
                emitter.on('sendMessage', (res) => {
                    expect(res).to.eql({
                        message: 'err: break time out of range *(max: 120)*',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!task 0 meeting';
                bot.startProcessing(data);
            });
        });

        describe.skip('multiple users', function () {

            it('should put ahouston and bnewman on task', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Put on task: ahouston bnewman. Please use *!back* to log back in when you are done',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!task ahouston bnewman';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe.skip('"me" argument', function () {
            it('should put ahouston on task', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Put ahouston on task for 10 minutes. Please use *!back* to log back in when you are done',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!task me 10 meeting';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe.skip('"me" argument with multiple users', function () {
            it('should put ahouston and bnewman on task', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Put on task: bnewman ahouston. Please use *!back* to log back in when you are done',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!task bnewman me';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('alternate command syntax', function () {
            it('should put ahouston on task', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Put ahouston on task for 10 minutes. Please use *!back* to log back in when you are done',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = 'breakbot: task 10 meeting';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

    });

    describe('!lunch', function () {

        beforeEach(function (done) {
            emitter = new EventEmitter();
            globals.channels['breakbot-support'].schedule = {};
            globals.channels['breakbot-support'].breaks.lunch = {};
            done();
        });

        describe('no arguments', function () {
            it('should set ahouston on lunch for 30 minutes', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set lunch for ahouston. See you in 30 minutes!',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!lunch';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('username given, no time', function () {
            it('should reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'no time given',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!lunch ahouston';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('only time argument given', function () {
            it('should schedule lunch for ahouston for 12:00', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set lunch for: ahouston',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!lunch 12';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('valid username, time: 12', function () {
            it('should schedule lunch for ahouston for 12:00', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set lunch for: ahouston',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!lunch ahouston 12';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('valid username, time: 12:00', function () {
            it('should schedule lunch for ahouston for 12:00', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set lunch for: ahouston',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!lunch ahouston 12:00';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('valid username, time: 1200', function () {
            it('should schedule lunch for ahouston for 12:00', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set lunch for: ahouston',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!lunch ahouston 1200';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('valid username, time: 12:30', function () {
            it('should schedule lunch for ahouston for 12:30', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set lunch for: ahouston',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!lunch ahouston 12:30';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('valid username, invalid time: 12:21', function () {
            it('should reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'invalid time: 12:21',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!lunch ahouston 12:21';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('invalid username, invalid time: abcd', function () {
            it('should reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'invalid time: abcd',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!lunch abcd efgh';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('valid username, invalid hour: abc:00', function () {
            it('should reject with error minutes', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'invalid time: abc:00',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!lunch ahouston abc:00';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('valid username, invalid minute: 12:abc', function () {
            it('should reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'invalid time: 12:abc',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!lunch ahouston 12:abc';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('valid username, invalid time: -1:-1', function () {
            it('should reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'invalid time: -1:-1',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!lunch -1:-1';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('no username, invalid time: 12:21', function () {
            it('should reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'invalid time: 12:21',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!lunch ahouston 12:21';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('"me" argument, no time', function () {
            it('should reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'no time given',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!lunch me';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('"list" argument', function () {
            it('should list scheduled lunch times', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'nobody scheduled for lunch',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!lunch list';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('"rm" argument with no lunch set', function () {
            it('should reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'lunch not found for: ahouston',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!lunch rm';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('alternate command syntax', function () {
            it('should set ahouston on lunch for 30 minutes', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set lunch for ahouston. See you in 30 minutes!',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = 'breakbot: lunch';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

    });

    describe('!bio', function () {

        beforeEach(function (done) {
            emitter = new EventEmitter();
            globals.channels['breakbot-support'].breaks.bio = {};

            done();
        });

        describe('no arguments', function () {
            it('should set ahouston on bio for 5 minutes', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set 5 minute bio for ahouston.',
                        channel: CHANLIST['breakbot-support']
                    });
                    expect(globals.channels['breakbot-support'].breaks.bio).to.have.property('ahouston');
                    done();
                });

                data.text = '!bio';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

        describe('alternate command syntax', function () {
            it('should set ahouston on bio for 5 minutes', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set 5 minute bio for ahouston.',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = 'breakbot: bio';
                bot.startProcessing(data);
                //messageController.handle(data);
            });
        });

    });

    describe('!back', function () {

        beforeEach(function (done) {
            emitter = new EventEmitter();
            done();
        });

        describe('no arguments', function () {
            it('should end ahouston\'s break', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'ahouston: welcome back!',
                        channel: CHANLIST['breakbot-support']
                    });
                    expect(globals.channels['breakbot-support'].breaks.active).to.be.empty();
                    done();
                });

                createBreak('ahouston', data.name, 'active', '10');

                data.text = '!back';
                bot.startProcessing(data);
            });
        });

        describe('alternate command syntax', function () {
            it('should end ahouston\'s break', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'ahouston: welcome back!',
                        channel: CHANLIST['breakbot-support']
                    });
                    expect(globals.channels['breakbot-support'].breaks.active).to.be.empty();
                    done();
                });

                createBreak('ahouston', data.name, 'active', '10');

                data.text = 'breakbot: back';
                bot.startProcessing(data);
            });
        });

    });

    describe('#Lunch scheduling', () => {
        let futureTime = new Date(new Date().setHours(24, 0, 0, 0));

        before(function (done) {
            emitter = new EventEmitter();
            done();
        });
        describe('scheduling lunch', () => {
            beforeEach(function (done) {
                emitter = new EventEmitter();
                done();
            });
            describe('#set lunch time', () => {
                it('should create lunch slot for ahouston at 12:00', done => {
                    emitter.on('sendMessage', res => {
                        expect(res).to.eql({
                            message: 'Set lunch for: ahouston',
                            channel: CHANLIST['breakbot-support']
                        });
                        //console.log(globals.channels['breakbot-support'].schedule[futureTime]);
                        expect(globals.channels['breakbot-support'].schedule).to.have.property(futureTime);
                        done();
                    });

                    data.text = '!lunch 12:00';
                    bot.startProcessing(data);
                });
            });

            describe('#schedule another lunch slot', () => {
                beforeEach(done => {
                    freshMock('breakbot-support');
                    done();
                });
                describe('same user', () => {
                    beforeEach(function (done) {
                        emitter = new EventEmitter();
                        done();
                    });
                    describe('same time', () => {
                        it('should reject with error', done => {
                            emitter.on('sendMessage', res => {
                                expect(res).to.eql({
                                    message: 'err: already scheduled',
                                    channel: CHANLIST['breakbot-support']
                                });
                                expect(globals.channels['breakbot-support'].schedule).to.have.property(futureTime);
                                done();
                            });

                            addLunchSlot('ahouston', 'breakbot-support', futureTime);
                            data.text = '!lunch 6:00';
                            bot.startProcessing(data);
                        });
                    });

                    describe('different time', () => {
                        it('should reject with error', done => {
                            emitter.on('sendMessage', res => {
                                expect(res).to.eql({
                                    message: 'err: already scheduled',
                                    channel: CHANLIST['breakbot-support']
                                });
                                expect(globals.channels['breakbot-support'].schedule).to.have.property(futureTime);
                                done();
                            });

                            addLunchSlot('ahouston', 'breakbot-support', futureTime);
                            data.text = '!lunch 12:00';
                            bot.startProcessing(data);
                        });
                    });
                });

                describe('different user', () => {
                    beforeEach(function (done) {
                        emitter = new EventEmitter();
                        done();
                    });
                    describe('same time', () => {
                        it('should schedule lunch for bnewman at 12:00', done => {
                            emitter.on('sendMessage', res => {
                                expect(res).to.eql({
                                    message: 'Set lunch for: bnewman',
                                    channel: CHANLIST['breakbot-support']
                                });
                                expect(globals.channels['breakbot-support'].schedule).to.have.property(futureTime);
                                done();
                            });

                            addLunchSlot('ahouston', 'breakbot-support', futureTime);
                            data.text = '!lunch bnewman 12:00';
                            bot.startProcessing(data);
                        });
                    });

                    describe('different time', () => {
                        it('should schedule lunch for bnewman at 13:00', done => {
                            emitter.on('sendMessage', res => {
                                expect(res).to.eql({
                                    message: 'Set lunch for: bnewman',
                                    channel: CHANLIST['breakbot-support']
                                });
                                expect(globals.channels['breakbot-support'].schedule).to.have.property(futureTime);
                                done();
                            });

                            addLunchSlot('ahouston', 'breakbot-support', futureTime);
                            data.text = '!lunch bnewman 13:00';
                            bot.startProcessing(data);
                        });
                    });
                })
            });
        });
    });
});

describe('Situations', function () {

    before(function (done) {
        freshMock('breakbot-support');
        done();
    });

    describe('#double breaks', function () {

        beforeEach(function (done) {
            emitter = new EventEmitter();
            done();
        });

        describe('original break', function () {
            it('should set ahouston on break for 10 minutes', function (done) {
                emitter.on('sendMessage', (res) => {
                    expect(res).to.eql({
                        message: 'Set break for ahouston for 10 minutes.',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!brb 10';
                bot.startProcessing(data);
            });
        });

        describe('second break', function () {
            it('should reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'err: already on break',
                        channel: CHANLIST['breakbot-support']
                    });
                    done();
                });

                data.text = '!brb 15';
                bot.startProcessing(data);
            });
        });
    });

    describe('#daily break limits', function () {

        before(function (done) {
            freshMock('breakbot-support');
            done();
        });

        beforeEach(function (done) {
            emitter = new EventEmitter();
            if (globals.channels.hasOwnProperty('breakbot-support')) {
                globals.channels['breakbot-support'].breaks.active = {};
                globals.channels['breakbot-support'].breaks.cooldown = {};
            }
            done();
        });

        describe('no breaks yet', function () {
            it('should set ahouston\'s break count to 1', function (done) {

                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set break for ahouston for 5 minutes.',
                        channel: CHANLIST['breakbot-support']
                    });
                    //console.log(globals.channels['breakbot-support'].breaks.count)
                    //expect(globals.channels['breakbot-support'].breaks.count['ahouston']).to.be(1);
                    done();
                });

                data.text = '!brb 5';
                bot.startProcessing(data);

            });
        });

        describe('one break taken', function (done) {
            it('should set ahouston\'s break count to 2', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'Set break for ahouston for 5 minutes.',
                        channel: CHANLIST['breakbot-support']
                    });

                    //expect(globals.channels['breakbot-support'].breaks.count['ahouston']).to.be(2);

                    done();
                });

                data.text = '!brb 5';
                bot.startProcessing(data);
            });
        });

        describe('at max breaks', function () {
            it('should reject with error', function (done) {
                emitter.on('sendMessage', function (res) {
                    expect(res).to.eql({
                        message: 'err: hit daily break limit (4)',
                        channel: CHANLIST['breakbot-support']
                    });

                    //expect(globals.channels['breakbot-support'].breaks.count['ahouston']).to.be(4);
                    done();
                });

                globals.channels['breakbot-support'].breaks.count['ahouston'] = 4;

                data.text = '!brb 5';
                bot.startProcessing(data);
            });
        });
    });

    describe('#multi-channel', function () {

        beforeEach(function (done) {
            emitter = new EventEmitter();

            // freshMock('breakbot-support');
            // freshMock('breakbot-livechat');

            freshMessage();
            done();
        });

        describe.skip('separate topics', function () {
            it('should maintain separate topics between channels', function (done) {

                emitter.on('sendMessage', function (res) {
                    expect(res);
                    done();
                })

            });
        });

        describe('separate breaks', function () {

            before(function (done) {
                // freshMock('breakbot-support');
                // freshMock('breakbot-livechat');
                freshMessage();
                done();
            });

            describe('#separate brb', function () {
                before(function (done) {
                    freshMock('breakbot-support');
                    freshMock('breakbot-livechat');
                    freshMessage();
                    done();
                });
                describe('first channel', function () {
                    it('should set ahouston on break in #breakbot-support', function (done) {
                        emitter.on('sendMessage', function (res) {
                            expect(res).to.eql({
                                message: 'Set break for ahouston for 5 minutes.',
                                channel: CHANLIST['breakbot-support']
                            });
                            expect(globals.channels['breakbot-support'].breaks.active).to.have.property('ahouston');
                            expect(globals.channels['breakbot-livechat'].breaks.active).to.be.empty();
                            done();
                        });

                        data.text = '!brb 5';
                        bot.startProcessing(data);
                    });
                });

                describe('second channel', function () {
                    it('set ahouston break in #breakbot-livechat', function (done) {
                        emitter.on('sendMessage', function (res) {
                            expect(res).to.eql({
                                message: 'Set break for ahouston for 5 minutes.',
                                channel: CHANLIST['breakbot-livechat'],
                            });
                            expect(globals.channels['breakbot-support'].breaks.active).to.have.property('ahouston');
                            expect(globals.channels['breakbot-livechat'].breaks.active).to.have.property('ahouston');
                            done();
                        });

                        data.name = 'breakbot-livechat';
                        data.channel = CHANLIST['breakbot-livechat'];
                        data.text = '!brb 5';
                        bot.startProcessing(data);
                    });
                });
            });

            describe('#separate lunch', function () {
                before(function (done) {
                    freshMock('breakbot-support');
                    freshMock('breakbot-livechat');
                    freshMessage();
                    done();
                });
                describe('first channel', function () {
                    it('should set ahouston on lunch in #breakbot-support', function (done) {
                        emitter.on('sendMessage', function (res) {
                            expect(res).to.eql({
                                message: 'Set lunch for ahouston. See you in 30 minutes!',
                                channel: CHANLIST['breakbot-support'],
                            });
                            expect(globals.channels['breakbot-support'].breaks.lunch).to.have.property('ahouston');
                            expect(globals.channels['breakbot-livechat'].breaks.lunch).to.be.empty();
                            done();
                        });

                        data.text = '!lunch';
                        bot.startProcessing(data);
                    });
                });

                describe('second channel', function () {
                    it('should set ahouston on lunch in #breakbot-livechat', function (done) {
                        emitter.on('sendMessage', function (res) {
                            expect(res).to.eql({
                                message: 'Set lunch for ahouston. See you in 30 minutes!',
                                channel: CHANLIST['breakbot-livechat'],
                            });
                            expect(globals.channels['breakbot-support'].breaks.lunch).to.have.property('ahouston');
                            expect(globals.channels['breakbot-livechat'].breaks.lunch).to.have.property('ahouston');
                            done();
                        });

                        data.name = 'breakbot-livechat';
                        data.channel = CHANLIST['breakbot-livechat'];
                        data.text = '!lunch';
                        bot.startProcessing(data);
                    });
                });

            });

            describe('#separate task', function () {
                before(function (done) {
                    freshMock('breakbot-support');
                    freshMock('breakbot-livechat');
                    freshMessage();
                    done();
                });
                describe('first channel', function () {
                    it('should set ahouston on task in #breakbot-support', function (done) {
                        emitter.on('sendMessage', function (res) {
                            expect(res).to.eql({
                                message: 'Put ahouston on task for 45 minutes. Please use *!back* to log back in when you are done',
                                channel: CHANLIST['breakbot-support'],
                            });
                            expect(globals.channels['breakbot-support'].breaks.task).to.have.property('ahouston');
                            expect(globals.channels['breakbot-livechat'].breaks.task).to.be.empty();
                            done();
                        });

                        data.text = '!task 45 meeting';
                        bot.startProcessing(data);
                    });
                });

                describe('second channel', function () {
                    it('should set ahouston on task in #breakbot-livechat', function (done) {
                        emitter.on('sendMessage', function (res) {
                            expect(res).to.eql({
                                message: 'Put ahouston on task for 45 minutes. Please use *!back* to log back in when you are done',
                                channel: CHANLIST['breakbot-livechat'],
                            });
                            expect(globals.channels['breakbot-support'].breaks.task).to.have.property('ahouston');
                            expect(globals.channels['breakbot-livechat'].breaks.task).to.have.property('ahouston');
                            done();
                        });

                        data.name = 'breakbot-livechat';
                        data.channel = CHANLIST['breakbot-livechat'];
                        data.text = '!task 45 meeting';
                        bot.startProcessing(data);
                    });
                });
            });

            describe('#separate bio', function () {
                before(function (done) {
                    freshMock('breakbot-support');
                    freshMock('breakbot-livechat');
                    freshMessage();
                    done();
                });
                describe('first channel', function () {
                    it('should set ahouston on bio in #breakbot-support', function (done) {
                        emitter.on('sendMessage', function (res) {
                            expect(res).to.eql({
                                message: 'Set 5 minute bio for ahouston.',
                                channel: CHANLIST['breakbot-support'],
                            });
                            expect(globals.channels['breakbot-support'].breaks.bio).to.have.property('ahouston');
                            expect(globals.channels['breakbot-livechat'].breaks.bio).to.be.empty();
                            done();
                        });

                        data.text = '!bio';
                        bot.startProcessing(data);
                    });
                });

                describe('second channel', function () {
                    it('should set ahouston on bio in #breakbot-livechat', function (done) {
                        emitter.on('sendMessage', function (res) {
                            expect(res).to.eql({
                                message: 'Set 5 minute bio for ahouston.',
                                channel: CHANLIST['breakbot-livechat'],
                            });
                            expect(globals.channels['breakbot-support'].breaks.bio).to.have.property('ahouston');
                            expect(globals.channels['breakbot-livechat'].breaks.bio).to.have.property('ahouston');
                            done();
                        });

                        data.name = 'breakbot-livechat';
                        data.channel = CHANLIST['breakbot-livechat'];
                        data.text = '!bio';
                        bot.startProcessing(data);
                    });
                });
            });

            describe('#separate back', function () {
                before(function (done) {
                    freshMock('breakbot-support');
                    freshMock('breakbot-livechat');
                    freshMessage();
                    done();
                });
                describe('first channel', function () {
                    it('should set ahouston on break in #breakbot-support', function (done) {
                        emitter.on('sendMessage', function (res) {
                            expect(res).to.eql({
                                message: 'Set break for ahouston for 5 minutes.',
                                channel: CHANLIST['breakbot-support'],
                            });
                            expect(globals.channels['breakbot-support'].breaks.active).to.have.property('ahouston');
                            expect(globals.channels['breakbot-livechat'].breaks.active).to.be.empty();
                            done();
                        });

                        data.text = '!brb';
                        bot.startProcessing(data);
                    });
                });

                describe('second channel', function () {
                    it('should reject with error in #breakbot-livechat', function (done) {
                        emitter.on('sendMessage', function (res) {
                            expect(res).to.eql({
                                message: 'err: not on break',
                                channel: CHANLIST['breakbot-livechat'],
                            });
                            expect(globals.channels['breakbot-support'].breaks.active).to.have.property('ahouston');
                            expect(globals.channels['breakbot-livechat'].breaks.active).to.be.empty();
                            done();
                        });

                        data.name = 'breakbot-livechat';
                        data.channel = CHANLIST['breakbot-livechat'];
                        data.text = '!back';
                        bot.startProcessing(data);
                    });
                });
            });

        });

        describe('separate lunch schedules', function () {
            before(function (done) {
                //emitter = new EventEmitter();
                freshMock('breakbot-support');
                freshMock('breakbot-livechat');
                freshMessage();
                done();
            });
            describe('#scheduling existing slot', function () {
                it('should schedule lunch for ahouston in #breakbot-support and #breakbot-livechat', function (done) {
                    let time = new Date(new Date().setHours(24, 0, 0, 0));
                    emitter.on('sendMessage', function (res) {
                        expect(res).to.eql({
                            message: 'Set lunch for: ahouston',
                            channel: CHANLIST['breakbot-support']
                        });
                        expect(globals.channels['breakbot-support'].schedule).to.have.property(time);
                        expect(globals.channels['breakbot-livechat'].schedule).to.have.property(time);
                        done();
                    });

                    addLunchSlot('ahouston', 'breakbot-livechat', time)
                        .then(() => {
                            data.text = '!lunch 12:00';
                            bot.startProcessing(data);
                        })

                });
            });

            describe.skip('#removing lunch slot', function () {
                it('should remove lunch slot', function (done) {
                    let time = new Date(new Date().setHours(24, 0, 0, 0));
                    emitter.on('sendMessage', function (res) {
                        expect(res).to.eql({
                            message: 'lunch not found for: ahouston',
                            channel: CHANLIST['breakbot-support']
                        });
                        //console.log(Object.keys(globals.channels['breakbot-support'].schedule[time]).length)
                        expect(globals.channels['breakbot-support'].schedule[time]).to.have.lengthOf(0);
                        expect(globals.channels['breakbot-livechat'].schedule).to.have.property(time);
                        done();
                    });

                    //addLunchSlot('ahouston', 'breakbot-support', time);
                    addLunchSlot('ahouston', 'breakbot-livechat', time)
                        .then(() => {
                            data.text = '!lunch rm me';
                            bot.startProcessing(data);
                        });

                });
            });
        });
    });
});