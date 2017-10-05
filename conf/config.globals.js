(() => {});
// (function (channelName, channelId, channelTopic)  {
//
//     let chan = {};
//     console.log(channelName);
//
//     chan.name = channelName;
//     chan.id = channelId;
//     chan.topic = channelTopic;
//     //TODO
//     //make sure not to overwrite this data during restart
//     chan.schedule = {};
//     chan.breaks = {
//         active: {},
//         bio: {},
//         lunch: {},
//         task: {},
//         over: {},
//         meeting: {},
//         count: {},
//     };
//
//     /* increments user's break count for the day */
//     chan.breaks.increment = (channel, user) => {
//         if (!(chan.breaks.count.hasOwnProperty(user))) {
//             chan.breaks.count[user] = 1;
//             return true;
//         }
//         else if (chan.breaks.count[user] < conf_breaks.maxDailyBreaks) {
//             chan.breaks.count[user] += 1;
//             return true;
//         }
//         else if (chan.breaks.count[user] === conf_breaks.maxDailyBreaks) {
//             console.log(new Date().toLocaleString() + ' ' + user + ' exceeded maximum daily breaks');
//             return false;
//         }
//         else {
//             console.error('BAD BREAK COUNT:');
//             console.error(this.breaks.count);
//         }
//
//     };
//
//     chan.breaks.clearBreaks = (user, channel) => {
//         delete chan.breaks.active[user];
//         delete chan.breaks.over[user];
//         delete chan.breaks.lunch[user];
//         delete chan.breaks.bio[user];
//     };
//
//     chan.punches = {
//         count: 0,
//         supervisors: []
//     };
//
//     return chan;
//
//
// })();
