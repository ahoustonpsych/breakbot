
const _ = require('lodash');
const Promise = require('promise');

let slack = require('./slack').rtm;
let db = require('./database').db;

let globals = require('../conf/config.globals');
let conf = require('../conf/config');

module.exports = {
    notifySupers: notifySupers
};

/*
 * pings all supervisors when someone is >2m over their break
 */
function notifySupers(notifyMsg, user, channel) {
    getAllPunchedSupers(user)
        .then(full_list => {
            if (!full_list instanceof Array) return false;
            /* do not send PMs if there's no supers */
            if (_.size(full_list) === 0) return false;
            /* send message to each supervisor */
            _.each(full_list, supervisor => {
                console.log(new Date().toLocaleString(),'SENT REMINDER TO:', supervisor, 'FOR:', user, '(#' + channel + ')');

                if (conf.ENV === 'stage')
                    slack.sendPrivateMessage(notifyMsg, slack.getUser(supervisor).id);
                else
                    console.log(new Date().toLocaleString(), 'PM SENT:', supervisor);
            });
        })
        .catch(err => console.error(new Date().toLocaleString(), err));
}

function getAllPunchedSupers(user) {
    return new Promise((fulfill,reject) => {

        let managerUnderlings = [],
            msg = [];

        getSupervisorByEmployee(user)
            .catch(err => reject('cant get employee super. ERROR:', err))
            .then(userSuper => {
                msg.push('Supervisor: ' + userSuper);

                getSupervisorByEmployee(userSuper)
                    .catch(err => reject('cant get shift manager. ERROR:', err))
                    .then(shiftManager => {
                        msg.push('Shift Manager: ' + shiftManager);

                        getUnderlingsByName(shiftManager)
                            .catch(err => reject('cant get shift manager underlings. ERROR:', err))
                            .then(underlings => {
                                _.each(underlings, name => managerUnderlings.push(name.username));

                                punchedSupers = arrangeSupers(managerUnderlings);
                                fulfill(punchedSupers);

                                msg.push('Manager direct reports: ' + managerUnderlings.sort().join(', '));
                                msg.push('All punched-in supervisors: ' + punchedSupers.sort().join(', '));
                                //debug
                                //console.log(msg.join('\n'));
                            });
                    });
            });
    });
}

/* returns a list of an employee's punched-in supervisors */
function getSupervisorByEmployee(username) {
    return new Promise((fulfill,reject) => {
        let supervisor = 'no super',
            chan = globals.channels[conf.channelDesignation['support']],
            query = "SELECT DISTINCT supervisor " +
                "FROM punch_history " +
                "WHERE supervisor != 'null' " +
                "AND username = '" + username + "'";

        db.query(query, (err, userSuper) => {
            if (userSuper && userSuper[0] instanceof Object) {
                supervisor = userSuper[0].supervisor;
                fulfill(supervisor);
            } else {
                if (!err)
                    err = 'no error or supervisor found? user: ' + username
                console.error(new Date().toLocaleString(), 'ERROR GETTING SUPERVISOR:', err)
                reject('no supervisor');
            }
        });
    });
}

function getUnderlingsByName(username) {
    return new Promise((fulfill,reject) => {
        let supervisor = 'no underlings found',
            query = "SELECT DISTINCT username " +
                "FROM punch_history " +
                "WHERE supervisor = '" + username + "'";

        db.query(query, (err, res) => {
            if (res && _.size(res) > 0) fulfill(res);
            else {
                console.error(new Date().toLocaleString(), 'ERROR GETTING UNDERLINGS:', err)
                reject('no underlings found');
            }
        });
    });
}

function arrangeSupers(list) {
    let channel = globals.channels[conf.channelDesignation['support']],
        punched = [];

    if (!channel.hasOwnProperty('supervisors')) return ['no supervisors'];

    _.forEach(channel.supervisors, sup => {
        if (list.includes(sup.username)) {
            punched.push(sup.username);
        }
    });

    if (punched.length === 0)
        punched.push('none found');

    return punched;

}
