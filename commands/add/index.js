const _ = require('lodash');

let slack = require('../../lib/slack').rtm;
let topic = require('../topic');

let globals = require('../../conf/config.globals');

module.exports = {
    expr: /^(!add)|(breakbot:? add)/i,
    run: add
};

/*
 * Add user or a list of users to the channel topic
 */
function add(data) {

    //assume user wants to add their own name if none is provided
    let arg = data.text? data.text.split(' '): [data.username];

    // let chanObj = globals.channels[data.name],
    //     arg = data.text.split(' '),
    //     subject = arg
    //                 ?slack.getUser(arg) //arg exists
    //                     ?slack.getUser(arg).name //arg has slack acct, set subject to slack acct's name
    //                     :data.username //arg does not have a slack acct, set subject to sender's username
    //                 :data.username; //arg does not exist, set subject to sender's username

    // console.log(`${subject}? ${chanObj.isInTopic(subject)}`);

    /* try to parse the arg if given. if it can't, defaults to the user that sent the message*/

    // if (!chanObj.isInTopic(subject)) {
    //     console.error('already in topic');
    //     return false;
    // }

    arg = arg.map(el => {
        el = topic.removeSpecial(el);
        return el.match(/^me$/i)? data.username: slack.getUser(el).name;
    });

    arg = _.uniqBy(arg, _.toLower);

    let res = topic.setTopic(data, `${globals.channels[data.name].topic} ${arg.join(' ')}`);

    /* TODO properly fix this */
    if (res) {
        slack.sendMessage('*err:* topic too long', data.channel);
    }

    console.log(new Date().toLocaleString(), `ADD: updated topic in ${data.name}:`, globals.channels[data.name].topic)
}