var https = require('https');

var lc_user = require('../config').lcAPIUser;
var lc_key = require('../config').lcAPIKey;

/*
 * changes an agent's status
 */

exports.changeStatus = function changeStatus(user, status, callback) {

    //possible values:
    //"accepting chats"
    //"not accepting chats"
    //"offline"
    var data = {status: status};

    var request = https.request({
        hostname: 'api.livechatinc.com',
        auth: lc_user + ':' + lc_key,
        method: 'PUT',
        path: '/agents/' + user + '@liquidweb.com',
        headers: {
            'X-API-VERSION': '2',
            'Content-type': 'application/json'
        }
    });

    //make API call to change agent's state
    request.write(JSON.stringify(data));

    //start of http response
    request.on('response', function (response) {
        var body = [];
        response.setEncoding('utf8');

        //http responses come in "chunks" of a certain length
        //this bit pushes all the "chunks" onto an array as they come in
        response.on('data', function(chunk) {
            body.push(chunk);
        });

        //once the response finishes, assemble all chunks and return the result.
        response.on('end', function () {
            return JSON.parse(body.join(''));
        });
    });

    request.end();
    return callback();
};


exports.getStatus = function getStatus(agent) {
    var request = https.request({
        hostname: 'api.livechatinc.com',
        auth: lc_user + ':' + lc_key,
        method: 'GET',
        path: '/agents/' + agent + '@liquidweb.com',
        headers: {
            'X-API-VERSION': '2',
            'Content-type': 'application/json'
        }
    });

    //parses response and gets the agent's status
    request.on('response', function (response) {
        var body = [];
        response.setEncoding('utf8');

        //http responses come in "chunks" of a certain length
        //this bit pushes all the "chunks" onto an array as they come in
        response.on('data', function(chunk) {
            body.push(chunk);
        });

        //once the response finishes, assemble all chunks and return the result.
        response.on('end', function () {
            var result = JSON.parse(body.join(''));
            return result.status;
        });
    });

    request.end();
};