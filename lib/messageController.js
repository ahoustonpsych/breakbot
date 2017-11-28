let slack = require('./slack').rtm;
let commands = require('../commands');
let topic = require('../commands/topic');
let conf = require('../conf/config');

exports.handle = function (data) {
    let hit = false;

    //ignore self and slackbot
    if (!!commands && data.user !== 'USLACKBOT' && data.user !== slack.getUser('breakbot').id) {
        //handle normal messages
        let message = data.text;
        commands.forEach((command) => {
            if (command.expr.test(message)) {
                data.text = truncMessage(data.text);
                data.breakType = command.run.name;      // breakType set based on command's "run" export
                if (!data.breakType) {
                    console.error(new Date().toLocaleString() + " COULDN'T ASSUME TYPE FROM COMMAND'S RUN FUNCTION: " + command);
                    return false;
                }

                if (conf.channelDesignation['supers'] === data.name) {
                    if (conf.superCommands.indexOf(data.breakType) !== -1) {
                        processSupers(data, command);
                        hit = true;
                        return true;
                    }
                    else return false;
                }
                //run command code
                command.run(data);
                hit = true;
            }

        });
        if (!hit && message[0] === '!') {
            slack.sendMessage('err: invalid command!', data.channel);
        }
    }
};

/*
 * runs when a command is used in the super channel
 */
function processSupers(data, command) {
    switch(data.breakType) {
        case 'list':
            let supportChan = conf.channelDesignation['support'],
                livechatChan = conf.channelDesignation['livechat'],
                combined = '#' + supportChan + '\n' +
                        command.getList(supportChan) + '\n\n' +
                        '#' + livechatChan + '\n' +
                        command.getList(livechatChan);

            slack.sendMessage(combined, data.channel);
            break;
        default:
            break;
    }
}

/*
 * removes breakbot's calling command
 * e.g. removes !brb, breakbot: brb, etc.
 */
function truncMessage(str) {
    let strArr = str.split(' ');

    if (strArr[0].match(/breakbot/i))
        strArr.shift();
    strArr.shift();

    return strArr.join(' ');
}