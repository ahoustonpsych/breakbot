
/*
 * misc functions, very contrived
 * will organize down the line
 */
class Helpers {
    /*
     * input: date obj
     * return: time formatted as: XX:YY AM
     */
    static formatTime(date) {
        if (!date instanceof Date) date = new Date(date);
        if (isNaN(Date.parse(date))) date = new Date();

        let meridiem = date.getHours() >= 12 ? 'PM' : 'AM',
            expireHours = date.getHours() > 12 ? date.getHours() % 12 : date.getHours(),
            expireMinutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();

        return `${expireHours}:${expireMinutes} ${meridiem}`;
    }
}

module.exports = Helpers;