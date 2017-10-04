let fs = require('fs');

let Promise = require('promise');

let conf = require('../conf/config');
let globals = require('../conf/config.globals');
let luncher = require('./luncher');


module.exports = {
    saveBreaks: saveBreaks,
    restoreBreaks: restoreBreaks
};

//TODO
//fix break save/restore
function saveBreaks() {

    let that = this;

    return new Promise(function (fulfill, reject) {

        /* all break data */
        let breakdata = JSON.stringify(that.active) + '\n' +
            JSON.stringify(that.over) + '\n' +
            JSON.stringify(that.task) + '\n' +
            JSON.stringify(that.lunch) + '\n' +
            JSON.stringify(that.bio) + '\n' +
            JSON.stringify(luncher.schedule);

        if (breakdata !== undefined) {
            fs.writeFileSync(conf.restore.savefile, breakdata);
            fulfill('success');
        }

        else reject('empty break data somehow: ' + breakdata);

    });
}

function restoreBreaks() {

    let that = this;

    fs.readFile(conf.restore.savefile, 'utf8', function (err,res) {

        if (err) console.error('not found');

        else if (!res) {
            console.log('no break data in file');
        }

        else {

            let rawbreaks = res.split('\n');

            breakdata = '{}\n{}\n{}\n{}\n{}\n{}';

            that.active = JSON.parse(rawbreaks[0]);
            that.over = JSON.parse(rawbreaks[1]);
            that.task = JSON.parse(rawbreaks[2]);
            that.lunch = JSON.parse(rawbreaks[3]);
            that.bio = JSON.parse(rawbreaks[4]);

            luncher.schedule = JSON.parse(rawbreaks[5]);

            //return if lunch schedule is empty
            if (luncher === {})
                return;

            //restore lunch times to date objects
            Object.keys(luncher.schedule).forEach(function (user) {
                luncher.schedule[user].time = new Date(luncher.schedule[user].time);
            });

            if (breakdata !== undefined) {
                fs.writeFileSync(conf.restore.savefile, breakdata);
            }

        }
    });
}