var fs = require('fs');

var Promise = require('promise');

var conf = require('../conf/config');

var onbreak = {};
var overbreak = {};
var out = {};
var lunch = {};
var bio = {};

module.exports = {
    onbreak: onbreak,
    overbreak: overbreak,
    out: out,
    lunch: lunch,
    bio: bio,
    clearBreaks: clearBreaks,
    saveBreaks: saveBreaks,
    restoreBreaks: restoreBreaks
};

function clearBreaks(user) {
    delete this.onbreak[user];
    delete this.overbreak[user];
    delete this.lunch[user];
    delete this.bio[user];
}

function saveBreaks() {

    var that = this;

    return new Promise(function (fulfill, reject) {

        /* all break data */
        var breakdata = JSON.stringify(that.onbreak) + '\n' +
            JSON.stringify(that.overbreak) + '\n' +
            JSON.stringify(that.out) + '\n' +
            JSON.stringify(that.lunch) + '\n' +
            JSON.stringify(that.bio);

        if (breakdata !== undefined) {
            fs.writeFileSync(conf.savefile, breakdata);
            fulfill('success');
        }

        else reject('empty break data somehow: ' + breakdata);

    });
}

function restoreBreaks() {

    var that = this;

    fs.readFile(conf.savefile, 'utf8', function (err,res) {

        if (err) console.error('not found');

        else if (!res) {
            console.log('no break data in file');
        }

        else {

            var rawbreaks = res.split('\n');

            that.onbreak = JSON.parse(rawbreaks[0]);
            that.overbreak = JSON.parse(rawbreaks[1]);
            that.out = JSON.parse(rawbreaks[2]);
            that.lunch = JSON.parse(rawbreaks[3]);
            that.bio = JSON.parse(rawbreaks[4]);

        }
    });
}