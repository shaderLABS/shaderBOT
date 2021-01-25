function getSeconds(time: string) {
    switch (time.replace(/[^a-z]/g, '')) {
        case 'a':
        case 'y':
            return +time.slice(0, -1) * 31556952;
        case 'mo':
            return +time.slice(0, -2) * 2592000;
        case 'w':
            return +time.slice(0, -1) * 604800;
        case 'd':
            return +time.slice(0, -1) * 86400;
        case 'h':
            return +time.slice(0, -1) * 3600;
        case 'min':
            return +time.slice(0, -3) * 60;
        case 's':
            return +time.slice(0, -1);
        default:
            return 0;
    }
}

const validUnits = [
    'a',
    'y',
    'year',
    'years',
    'mo',
    'month',
    'months',
    'w',
    'week',
    'weeks',
    'd',
    'day',
    'days',
    'h',
    'hour',
    'hours',
    'min',
    'mins',
    'minute',
    'minutes',
    's',
    'sec',
    'secs',
    'second',
    'seconds',
];

export function splitString(str: string): string[] {
    const cleanedString = str.replaceAll(' ', '').toLowerCase();

    const units = cleanedString.split(/[0-9]/).filter(Boolean);
    if (units.length === 0 || units.some((unit) => !validUnits.includes(unit))) throw 'At least one of the time units is invalid.';

    const splitString = cleanedString.match(/\d+(a|y|mo|w|d|h|min|s)/g);
    if (!splitString || splitString.length !== units.length) throw 'You can not use units without specifying their quantity.';
    return splitString;
}

export default function (str: string[]) {
    const MAX_SECONDS = 8639999999000 - new Date().getTime() / 1000;
    const seconds = str.reduce((a, b) => a + getSeconds(b), 0);

    return seconds > MAX_SECONDS ? NaN : seconds;
}
