let _ = require('lodash');
let RtmClient = require('@slack/client').RtmClient;
let WebClient = require('@slack/client').WebClient;

let MemoryDataStore = require('@slack/client').MemoryDataStore;

let topic = require('../commands/topic');

let config = require('../conf/config');

let rtm = new RtmClient(config.slackAPIKey, {
    logLevel: config.loglevel,
    dataStore: new MemoryDataStore()
});

let web = new WebClient(config.slackAPIKey);

/* fetch user object */
rtm.getUser = function (ident) {
    if (typeof(ident) !== 'string') {
        console.error(new Date().toLocaleString(), 'Invalid username:', ident);
        return 'not defined';
    }
    let pattern = /<@(.*)>/;

    if (ident.match(pattern)) {
        ident = ident.match(pattern)[1];
    }
    return rtm.dataStore.getUserByName(ident.toLowerCase()) || rtm.dataStore.getUserById(ident) || 'not defined';
};

rtm.isUser = function (user) {
    let cleaned,
        pattern = /<@(.*)>/;

    if (user.match(pattern)) {
        cleaned = user.match(pattern)[1];
    } else {
        cleaned = topic.removeSpecial(user).toLowerCase();
    }
    return rtm.getUser(cleaned) instanceof Object;
};

rtm.getChannel = function (ident) {
    if (typeof(ident) !== 'string') {
        console.error(new Date().toLocaleString() + ' Invalid channel: ' + ident);
        return 'not defined';
    }
    return rtm.dataStore.getChannelGroupOrDMById(ident) ||
            rtm.dataStore.getChannelOrGroupByName(ident);
};

/* send DM to user */
rtm.sendPrivateMessage = function (text, userId) {
    rtm.getDM(userId)
        .then(userDM => {
            rtm.sendMessage(text, userDM);
        })
        .catch((err) => {
            console.error(new Date().toLocaleString(), 'ERROR OPENING DM: ', err);
        });
};

rtm.getDM = function (user) {
    return new Promise((fulfill,reject) => {
        let userId = rtm.getUser(user).id;

        web.im.open(userId)
            .then(function (res) {
                fulfill(res.channel.id)
            })
            .catch(function (err) {
                console.error(new Date().toLocaleString(), 'ERROR!!!', err);
                reject();
            });
    });
    //userDMId = web.im.open(userId).then(res => {return res}).catch(err => console.error(err));
};

/* sends message with interactive slack button */
rtm.sendPrivateButton = function (msg, user) {
    return new Promise((fulfill, reject) => {
        let attachments,
            userObj = rtm.getUser(user);

        attachments2 = {
            as_user: true,      //
            attachments: [{
                pretext: 'attachments.attachments[0].pretext',      //
                text: 'attachments.attachments[0].text',            //
                fallback: 'attachments.attachments[0].fallback',    //
                callback_id: 'callback_' + _.uniqueId(),            // create unique callback_id for each button
                color: '#3AA3E3',
                attachment_type: 'default',
                actions: [{
                    name: 'attachments.attachments[0].actions[0].name',
                    text: 'attachments.attachments[0].actions[0].text',
                    type: 'button',
                    value: 'attachments.attachments[0].actions[0].value'
                }, {
                    name: 'attachments.attachments[0].actions[1].name',
                    text: 'attachments.attachments[0].actions[1].text',
                    type: 'button',
                    style: 'danger',
                    value: 'attachments.attachments[0].actions[1].value',
                    confirm: {
                        title: 'attachments.attachments[0].actions[1].confirm.title',
                        text: 'attachments.attachments[0].actions[1].confirm.text',
                        ok_text: 'attachments.attachments[0].actions[1].confirm.ok_text',
                        dismiss_text: 'attachments.attachments[0].actions[1].confirm.dismiss_text'
                    }
                }]
            }]
        };

        attachments = {
            as_user: true,      //
            text: 'TASK REQUEST',
            attachments: [{
                //pretext: 'New Task Request!',      //
                //text: 'New Task Request!',
                fields: [{
                    title: 'Name',
                    value: userObj.name,
                    short: true
                }, {
                    title: 'Channel',
                    value: '#break',
                    short: true
                }, {
                    title: 'Length',
                    value: '90 minutes',
                    short: true
                }, {
                    title: 'Reason',
                    value: 'open enrollment training',
                    short: true
                }]
            }, {
                title: 'Select an option:',            //
                fallback: 'Select an option:',    //
                callback_id: 'callback_' + _.uniqueId(),            // create unique callback_id for each button
                color: '#333333',
                attachment_type: 'default',
                actions: [{
                    name: 'approveName',
                    text: 'Approve Task',
                    type: 'button',
                    value: 'approveValue'
                }, {
                    name: 'denyName',
                    text: 'Deny Task',
                    type: 'button',
                    style: 'danger',
                    value: 'denyValue',
                    confirm: {
                        title: 'Confirm task deny',
                        text: 'Confirm task deny',
                        ok_text: 'Deny',
                        dismiss_text: 'Cancel'
                    }
                }]
            }]
        };

        rtm.getDM(user)
            .catch(err => reject(err))
            .then(userDM => {
                web.chat.postMessage(userDM, msg, attachments)
                    .then(res => {
                        console.log(res)
                        fulfill('sent!')
                    })
                    .catch(err => reject('failed to send!', err));
            });
    });
};

rtm.start();

exports.rtm = rtm;
exports.web = web;