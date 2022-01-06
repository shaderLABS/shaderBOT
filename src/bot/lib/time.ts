import { Formatters } from 'discord.js';

function getSeconds(time: string) {
    switch (time.replace(/[^a-z]/g, '')) {
        case 'a':
        case 'y':
            return +time.slice(0, -1) * 31536000;
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
    if (units.length === 0 || units.some((unit) => !validUnits.includes(unit))) {
        throw 'At least one of the time units is invalid or unspecified.\n[Click here](https://github.com/shaderLABS/shaderBOT-server/wiki#time-notation) for more information.';
    }

    const splitString = cleanedString.match(/\d+(a|y|mo|w|d|h|min|s)/g);
    if (!splitString || splitString.length !== units.length) {
        throw 'You can not use units without specifying their quantity.\n[Click here](https://github.com/shaderLABS/shaderBOT-server/wiki#time-notation) for more information.';
    }

    return splitString;
}

export function stringToSeconds(str: string[]) {
    const MAX_SECONDS = 8639999999000 - Date.now() / 1000;
    const seconds = str.reduce((a, b) => a + getSeconds(b), 0);

    return seconds > MAX_SECONDS ? NaN : seconds;
}

export function secondsToString(seconds: number) {
    const units: string[] = [];

    const years = Math.floor(seconds / 31536000);
    if (years) units.push(years + 'a');
    seconds -= years * 31536000;

    const months = Math.floor(seconds / 2592000);
    if (months) units.push(months + 'mo');
    seconds -= months * 2592000;

    const weeks = Math.floor(seconds / 604800);
    if (weeks) units.push(weeks + 'w');
    seconds -= weeks * 604800;

    const days = Math.floor(seconds / 86400);
    if (days) units.push(days + 'd');
    seconds -= days * 86400;

    const hours = Math.floor(seconds / 3600);
    if (hours) units.push(hours + 'h');
    seconds -= hours * 3600;

    const minutes = Math.floor(seconds / 60);
    if (minutes) units.push(minutes + 'min');
    seconds -= minutes * 60;

    if (seconds) units.push(Math.round(seconds) + 's');

    return units.join(' ');
}

export function formatTimeDate(date: Date) {
    return Formatters.time(date, Formatters.TimestampStyles.LongDateTime);
}

export function formatTimeDateString(date: Date) {
    return date.toLocaleString('en-US', {
        timeZoneName: 'short',
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    });
}

export function formatDate(date: Date) {
    return Formatters.time(date, Formatters.TimestampStyles.LongDate);
}

export function formatRelativeTime(date: Date) {
    return Formatters.time(date, Formatters.TimestampStyles.RelativeTime);
}
