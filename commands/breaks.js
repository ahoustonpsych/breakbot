var onbreak = {};
var overbreak = {};
var out = {};
var lunch = {};

module.exports = {
    onbreak: onbreak,
    overbreak: overbreak,
    out: out,
    lunch: lunch,
    clearBreaks: function (user) {
        clearBreaks(user);
    }
};

function clearBreaks(user) {
    delete onbreak[user];
    delete overbreak[user];
    delete lunch[user];
}