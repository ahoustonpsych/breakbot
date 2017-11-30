
// const WebSocket = require('ws');
// let express = require('express');
// let app = express();
// let server = require('http').createServer();
const _ = require('lodash');
let Promise = require('promise');
//let path = require('path');
let https = require('https');
let fs = require('fs');

let topic = require('../commands/topic');

let globals = require('../conf/config.globals');
let conf = require('../conf/config');
let conf_breaks = require('../conf/config.breaks');
let db = require('../lib/database');

module.exports = { getPunchedIn };

function getPunchedIn() {

    getAgentData()
        .then((punchList) => {
            cleanPunchList(punchList)
                .then((punchedIn) => {
                    // console.log(punchedIn['ahouston']);
                    arrangePunchedIn(punchedIn);
                    console.log(new Date().toLocaleString() + ' finished grabbing punch data');
                })
                .catch((err) => console.error(new Date().toLocaleString() + ' BAD PUNCH DATA', err));
        })
        .catch((err) => console.error(new Date().toLocaleString() + ' ERROR RETRIEVING AGENT DATA', err));

}

function getAgentData() {
    return new Promise((fulfill, reject) => {
        apiCall('wallboard.supportdev.liquidweb.com', '/api/data/agents')
            .then((res) => fulfill(res))
            .catch((err) => reject(err));
    });
}

/* retrieves agent data from wallboard */
function apiCall(host, path) {
    return new Promise((fulfill, reject) => {
        console.log(new Date().toLocaleString() + ' retrieving agent data');
        let request = https.request({
            hostname: host,
            path: path,
            headers: {
                'Content-type': 'application/json'
            }
        });

        /* parses response and gets the agent's status */
        request.on('response', (response) => {
            let body = [];
            response.setEncoding('utf8');
            console.log(new Date().toLocaleString() + ' wallboard response');

            /* http responses come in "chunks" of a certain length
             this pushes all the "chunks" onto an array as they come in */
            response.on('data', (chunk) => {
                body.push(chunk);
                // console.log('data');
            });

            /* once the response finishes, assemble all chunks and return the result */
            response.on('end', (err, res) => {
                // console.log('end')
                console.log(new Date().toLocaleString() + ' wallboard request finished');
                request.end();

                if (err) console.error(new Date().toLocaleString() + ' ERROR MAKING API CALL', err);
                else {
                    try {
                        fulfill(JSON.parse(body.join('')));
                    }
                    catch (e) {
                        console.error(new Date().toLocaleString() + ' INVALID JSON RESPONSE:');
                        reject(e);
                    }
                }
            });
        });

        request.on('error', function (err) {
            request.end();
            console.error(new Date().toLocaleString() + ' API REQUEST FAILED', err);
            reject(err);
        });

        request.end();
    });
}

/* removes users that are not punched in */
function cleanPunchList(list) {
    return new Promise(function (fulfill, reject) {
        console.log(new Date().toLocaleString() + ' cleanPunchList');

        let punchedIn = {};

        //clear punches
        _.forEach(globals.channels, (v,k) => {
            globals.channels[k].punches = {};
            globals.channels[k].punchCount = 0;
            globals.channels[k].supervisors = [];
        });

        _.forEach(list, (i,agent,list) => {

            /* discard if no department */
            if (!(list[agent].hasOwnProperty('dept')))
                return;

            /* discard if no title */
            if (!(list[agent].hasOwnProperty('title')))
                return;

            /* only track support...for now */
            if (!(list[agent].dept === 'support'))
                return;

            list[agent].username = agent;

            /* discard punched-out users */
            if (!(list[agent].hasOwnProperty('punched'))) {
                list[agent].punched = false;
                logPunchData(list[agent]);
                return;
            }

            /* discard Touchsupport users */
            // if (!!list[agent].title && list[agent].title.match(/[^^]Support/) !== null)
            //     return;

            /* set "near eos" flag if it's not set */
            if (!(list[agent].hasOwnProperty('punched_eos')))
                list[agent].punched_eos = false;

            if (list[agent].title.match(/Supervisor/)) {
                addSuper(list[agent]);
                logPunchData(list[agent]);
            }

            punchedIn[agent] = list[agent];

            logPunchData(punchedIn[agent]);

        });

        if (!punchedIn instanceof Object)
            reject(punchedIn);

        fulfill(punchedIn);

    });
}

/* organizes punched-in list by department
 * also filters out users we don't want, like supervisors */
function arrangePunchedIn(punched) {
    console.log(new Date().toLocaleString() + ' arrangePunchList');

    Object.keys(punched).forEach((name) => {
        //console.log(punched[name]);
        let dept = punched[name].dept,
            numChatters = topic.getChatters(conf.channelDesignation['livechat']).length,
            chatChan = globals.channels[conf.channelDesignation['livechat']],
            phoneChan = globals.channels[conf.channelDesignation['support']];

        if (!(globals.channels.hasOwnProperty(conf.channelDesignation[dept])))
            return;

        /* SET BREAK LIMITS */
        /* TODO clean this up */

        //set chatter break limits
        chatChan.punchCount = numChatters;

        chatChan.maxOnBreak =
            Math.ceil(numChatters * conf_breaks.maxOnBreakPercentageLiveChat);

        /* set minimum on-break limit */
        if (chatChan.maxOnBreak < 2)
            chatChan.maxOnBreak = 2;

        //log all users that are punched in
        //TODO fix this biz
        phoneChan.punches[name] = punched[name];

        //total punched in
        phoneChan.punchCount =
            Object.keys(phoneChan.punches).length - numChatters;

        //sets maxOnBreak based on the number of people punched in
        phoneChan.maxOnBreak =
            Math.ceil(phoneChan.punchCount * conf_breaks.maxOnBreakPercentage);

        if (phoneChan.maxOnBreak < 2)
            phoneChan.maxOnBreak = 2;

    });
    // console.log(globals.channels['breakbot-support'].punches);
    // console.log('num: ' + globals.channels['breakbot-support'].punchCount);

}

function logPunchData(agentdata) {

    function check(data) {
        return new Promise((fulfill,reject) => {
            let punchCheckQuery =
                'SELECT punched' +
                '  FROM punch_history' +
                ' WHERE date = DATE(NOW())' +
                '   AND username = "' + data.username + '"' +
                ' ORDER BY time DESC' +
                ' LIMIT 1';

            //if (data.username === 'ahouston') data.punched = null;

            db.queryDB(punchCheckQuery)
                .then(res => {
                    let punchStatus = data.punched ? 'in' : 'out';

                    if (!res instanceof Array) reject('not an array');

                    if (_.size(res) === 0) {
                        console.log(new Date().toLocaleString(), 'LOGGED FIRST PUNCH FOR:', data.username);
                        fulfill('first punch')
                    }

                    if (!res[0].hasOwnProperty('punched')) reject('punched column not found');

                    if (res[0].punched === punchStatus) {
                        reject(data.username + ': already punched ' + punchStatus);
                        return false;
                    }

                    fulfill('time to punch');
                })
                .catch(err => {
                    console.error(new Date().toLocaleString(), 'select failed:', data.username);
                });
        })
    }

    function log(data) {
        return new Promise((fulfill, reject) => {
            let logdata = {
                date: 'today',
                time: 'now',
                title: data.title,
                username: data.username || null,
                real_name: data.name || null,
                supervisor: data.supervisor || null,
                dept: data.dept,
                punched: data.punched ? 'in' : 'out'
            };

            db.log('punch_history', logdata)
                .then(res => fulfill(data.username + ': success'))
                .catch((err) => {
                    if (err.code !== 'ER_DUP_ENTRY')
                        reject('duplicate');
                    else
                        console.error(new Date().toLocaleString(), 'ERROR LOGGING PUNCH:', err);
                });
        })

    }

    check(agentdata)
        .then(res => {
            log(agentdata)
                .then(res => {
                    console.log(new Date().toLocaleString(), 'ADDED PUNCH TIME FOR:', agentdata.username);
                })
                .catch(err => console.error(new Date().toLocaleString(), 'ERROR LOGGING PUNCH:', err))
        })
        .catch(err => console.error(new Date().toLocaleString(), 'ERROR QUEYING DATABSE:', err));

}

/* add supervisors to channel object */
function addSuper(userObj) {
    //TODO error handling out the butt
    globals.channels[conf.channelDesignation[userObj.dept]].supervisors.push(userObj);
}