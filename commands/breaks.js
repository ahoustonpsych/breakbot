
var onbreak = {};
var overbreak = {};
var out = {};

module.exports = {
    onbreak: onbreak,
    overbreak: overbreak,
    out: out,
    clearBreaks: function (user) {
        clearBreaks(user);
    }
};

function clearBreaks(user) {
    delete onbreak[user];
    delete overbreak[user];
}