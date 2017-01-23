var https = require('https');
var Promise = require('promise');

var conf = require('../conf/config');

function APICall(path, method, callback) {
    var request = https.request({
        hostname: 'api.livechatinc.com',
        auth: conf.lcAPIUser + ':' + conf.lcAPIKey,
        method: method,
        path: path,
        headers: {
            'X-API-VERSION': '2',
            'Content-type': 'application/json'
        }
    });

    /* parses response and gets the agent's status */
    request.on('response', function (response) {
        var body = [];
        response.setEncoding('utf8');

        /* http responses come in "chunks" of a certain length
         this pushes all the "chunks" onto an array as they come in */
        response.on('data', function (chunk) {
            body.push(chunk);
        });

        /* once the response finishes, assemble all chunks and return the result */
        response.on('end', function () {
            request.end();
            return callback(null, JSON.parse(body.join('')));
        });
    });

    request.on('error', function (err) {
        request.end();
        console.error('CHANGE AGENT STATUS CALL FAILED', err);
    });

    request.end();
}


/*
 * changes an agent's status
 */
exports.changeStatus = function (user, status) {

    return new Promise(function (fulfill, reject) {
        /* possible values:
         "accepting chats"
         "not accepting chats"
         "offline" */
        var data = {status: status};

        var request = https.request({
            hostname: 'api.livechatinc.com',
            auth: conf.lcAPIUser + ':' + conf.lcAPIKey,
            method: 'PUT',
            path: '/agents/' + user + conf.userdomain[conf.ENV],
            headers: {
                'X-API-VERSION': '2',
                'Content-type': 'application/json',
                'Content-length': JSON.stringify(data).length
            }
        });

        /* make the call to change agent's state */
        request.write(JSON.stringify(data));

        /* start of http response */
        request.on('response', function (res) {
            var body = [];
            res.setEncoding('utf8');

            /* http responses come in "chunks" of a certain length
             this bit pushes all the "chunks" onto an array as they come in */
            res.on('data', function (chunk) {
                body.push(chunk);
            });

            /* once the response finishes, assemble all chunks and return the result. */
            res.on('end', function (err) {
                request.end();

                if (err) reject(err);
                else {
                    try {
                        fulfill(JSON.parse(body.join('')));
                    }
                    catch (e) {
                        console.error('BAD RESPONSE, COULDN\'T PARSE');
                        console.error('RESPONSE BODY: ' + body.join(''));
                        reject(e);
                    }
                }
            });
        });

        request.on('error', function (err) {
            reject(err);
        });
    });
};

/*
 * retrieve's agent's current status
 */
exports.getAgentStatus = function (agent) {
    return new Promise(function (fulfill, reject) {
        APICall('/agents/' + agent + conf.userdomain[conf.ENV], 'GET',
            function (err, res) {
                if (err) reject(err);
                else fulfill(res.status);
            });
    });
};


/*
 * get chat data for the last 5 minutes
 */
exports.getChats = function () {
    return new Promise(function (fulfill, reject) {
        APICall('/chats?' +
            'date_from=' + new Date().toJSON().split('T')[0] + '&' +
            'include_pending=1' + '&' +
            'group=1', 'GET',
            function (err, res) {
                if (err) reject(err);
                else fulfill(res.chats);
            });
    });
};

/*
 * return list of agents
 */
exports.getAgents = function (status, callback) {
    APICall('/agents?status=' + encodeURIComponent(status), 'GET',
        function (data) {
            return callback(data);
        });
};