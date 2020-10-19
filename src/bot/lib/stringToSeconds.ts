function getSeconds(time: string) {
    switch (time.replace(/[^A-Za-z]/g, '')) {
        case 'a':
            return +time.slice(0, -1) * 31556952;
        case 'mo':
            return +time.slice(0, -2) * 2592000;
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

export function splitString(str: string): string[] {
    return str.match(/\d*(a|mo|d|h|min|s)/g) || [];
}

export default function (str: string[]) {
    return str.reduce((a, b) => a + getSeconds(b), 0);
}
