
var onbreak = {};
var overbreak = {};

module.exports = {
    onbreak: onbreak,
    overbreak: overbreak,
    clearBreaks: function (user) {
        clearBreaks(user);
    }
};

function clearBreaks(user) {
    clearTimeout(onbreak[user]);
    clearInterval(overbreak[user]);
    delete onbreak[user];
    delete overbreak[user];
}