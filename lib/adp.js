
// const WebSocket = require('ws');
// let express = require('express');
// let app = express();
// let server = require('http').createServer();
let Promise = require('promise');
//let path = require('path');
let https = require('https');
let fs = require('fs');

let topic = require('../commands/topic');

let globals = require('../conf/config.globals');
let conf = require('../conf/config');
let conf_breaks = require('../conf/config.breaks');

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

    // getAgentData()
    //     .then((punchList) => {
    //         let punched = cleanPunchList(punchList);
    //         Object.keys(punched).forEach((agent) => {
    //             if (punched[agent].punched_eos)
    //                 console.log(punched[agent]);
    //         });
    //     })
    //     .catch((err) => {
    //         console.error('INVALID PUNCH DATA:');
    //         console.error(err);
    //     });

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

        Object.keys(list).forEach(function (agent) {

            /* discard punched-out users */
            if (!(list[agent].hasOwnProperty('punched')))
                return;

            /* discard if no department */
            if (!(list[agent].hasOwnProperty('dept')))
                return;

            /* discard if no title */
            if (!(list[agent].hasOwnProperty('title'))) {
                return;
            }

            /* only track support...for now */
            if (!(list[agent].dept === 'support'))
                return;

            /* discard Touchsupport users */
            if (!!list[agent].title && list[agent].title.match(/Support (Technician|Supervisor)/) === null)
                return;

            /* set "near eos" flag if it's not set */
            if (!(list[agent].hasOwnProperty('punched_eos')))
                list[agent].punched_eos = false;

            list[agent].name = agent;

            if (list[agent].title.match(/Supervisor/)) {
                addSuper(list[agent]);
                return;
            }

            punchedIn[agent] = list[agent];

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
        let dept = punched[name].dept;

        if (!(globals.channels.hasOwnProperty(conf.channelDesignation[dept])))
            return;

        let numChatters = topic.getChatters(conf.channelDesignation['livechat']).length;

        /* SET BREAK LIMITS */

        //set chatter break limits
        globals.channels[conf.channelDesignation['livechat']].punchCount = numChatters;
        globals.channels[conf.channelDesignation['livechat']].maxOnBreak = Math.ceil(numChatters * 0.15);

        //log all users that are punched in
        globals.channels[conf.channelDesignation[dept]].punches[name] = punched[name];
        //total punched in
        globals.channels[conf.channelDesignation[dept]].punchCount = Object.keys(globals.channels[conf.channelDesignation[dept]].punches).length - numChatters;

        //sets maxOnBreak based on the number of people punched in
        globals.channels[conf.channelDesignation[dept]].maxOnBreak = Math.ceil(globals.channels[conf.channelDesignation[dept]].punchCount * 0.15);

    });
    // console.log(globals.channels['breakbot-support'].punches);
    // console.log('num: ' + globals.channels['breakbot-support'].punchCount);

}

/* add supervisors to channel object */
function addSuper(userObj) {
    globals.channels[conf.channelDesignation[userObj.dept]].supervisors.push(userObj);
}