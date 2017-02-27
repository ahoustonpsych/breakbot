var https = require('https');
var Promise = require('promise');

var slack = require('../lib/slack').rtm;

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
        response.on('end', function (err, res) {
            request.end();

            if (err) console.error('ERROR MAKING API CALL', err);
            else {
                try {
                    return callback(null, JSON.parse(body.join('')));
                }
                catch (e) {
                    console.error('ERROR PARSING API CALL RESPONSE');
                    console.error('RESPONSE BODY: ' + body);
                    console.error('RESPONSE: ' + res);
                    console.error(e);
                    return callback(e, null);
                }
            }
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
                else fulfill(res);
            });
    });
};


/*
 * all chats for today, including active ones
 */
exports.getRecentChats = function () {
    return new Promise(function (fulfill, reject) {

        retrieveAll(1, [])
            .then(function (chats) {
                fulfill(chats);
            })
            .catch(function (err) {
                reject(err);
            });
    });
};

//grabs the last few pages of chats, and returns them
function retrieveAll(page, chatlist) {
    return new Promise(function (fulfill, reject) {

        var fullchats = chatlist;

        //uri to get all chats, minus the page number (url + page)
        var url = '/chats?' +
            //'date_from=' + new Date(new Date().toDateString()).toJSON().split('T')[0] + '&' +
            //yesterday
            'date_from=' + new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toJSON().split('T')[0] + '&' +
            'include_pending=1' + '&' +
            'group=1' + '&' +
            'page=';

        //console.log(url + page);

        APICall(url + page, 'GET',
            function (err, res) {
                if (err) reject(err);
                else {
                    if (res.hasOwnProperty('chats')) {
                        fullchats.push(res.chats);

                        if (page >= res.pages || page >= 6) {
                            flattened = [].concat.apply([], fullchats);
                            //console.log('done, returning');
                            fulfill(flattened);
                        }

                        //recurse for new pages
                        else {
                            retrieveAll(page + 1, fullchats)
                                .then(function (result) {
                                    fulfill(result);
                                })
                                .catch(function (err) {
                                    reject(err);
                                });
                        }
                    }
                }
            });
    });
}

//TODO
//finish this
exports.getChatDurations = function () {
    i = 0
    this.getRecentChats()
        .then(function (chats) {
            //console.log(chats);

            console.log(chats.length);

            if (!(chats instanceof Array))
                return false;

            chats.forEach(function (chat) {

                //only get active chats
                if (!chat.pending)
                    return false;

                //i += 1;
                //console.log(i);

                chatter = chat.agents[0].email.split('@')[0];
                duration = chat.duration;
                id = chat.id;
                visitor = chat.visitor_name;

                if (typeof(duration) !== 'number')
                    return false;

                if (duration/60 > 60) {

                    notice = 'long chat notice: *' +
                        chatter +
                        '* has been chatting with *' +
                        visitor +
                        '* for over an hour. id: `' +
                        id + '`';

                    slack.sendMessage(notice, slack.dataStore.getChannelOrGroupByName(conf.notifychannel[conf.ENV]).id);

                }

                console.log('agent: ' + chatter + '\ttime: ' + duration/60 + '\tvisitor: ' + visitor + ' id: ' + id);

            });

        })
        .catch(function (err) {
            console.error(err);
        });
};


/*
 * return list of agents
 */
exports.getAgents = function (status, callback) {
    APICall('/agents?status=' + encodeURIComponent(status), 'GET',
        function (err, res) {
            if (err) console.error('ERROR GETTING AGENTS', err);
            else {
                try {
                    return callback(null, res);
                }
                catch (e) {
                    console.error('ERROR PARSING AGENTS');
                    console.error('RESPONSE BODY: ' + res);
                    console.error(e);
                    return callback(e, null);
                }
            }
        });
};

/*
 * change chatter's chat limit
 */
exports.changeLimit = function (user, count) {

    return new Promise(function (fulfill, reject) {

        var data = {max_chats_count: count};

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

        /* make the call to change agent's limit */
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
                        //console.log(body);
                        fulfill(JSON.parse(body.join('')));
                    }
                    catch (e) {
                        console.error('BAD RESPONSE, COULDN\'T PARSE');
                        console.error('RESPONSE BODY: ' + body);
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