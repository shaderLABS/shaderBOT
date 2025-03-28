import { CategoryChannel, ChannelType, escapeMarkdown, Guild, TextChannel, User, type Snowflake, type UserResolvable } from 'discord.js';
import { client, settings } from '../bot.ts';

// Create an object type containing the properties K from object type T.
// Make the property types T[P] of that temporary object type NonNullable and all its properties P Required.
// Return the intersection between the object type T and the temporary object type.
export type NonNullableProperty<T, K extends keyof T> = T & Required<{ [P in keyof Pick<T, K>]: NonNullable<T[P]> }>;

export function getGuild() {
    const guild = client.guilds.cache.get(settings.data.guildID);
    if (!guild) throw 'The specified guild does not exist.';

    return guild;
}

export function shutdown(code: number = 0) {
    console.log('Shutting down...');
    client?.destroy();
    process.exit(code);
}

export function userToMember(userResolvable: UserResolvable, guild: Guild = getGuild()) {
    return guild.members.fetch(userResolvable).catch(() => undefined);
}

export function getAlphabeticalChannelPosition(channel: TextChannel, parent: CategoryChannel | null) {
    if (!parent) return 0;

    const totalChannels = parent.children.cache
        .filter((channel) => channel.type === ChannelType.GuildText)
        .set(channel.id, channel)
        .sort((a, b) => a.name.replace(/[^\x00-\x7F]/g, '').localeCompare(b.name.replace(/[^\x00-\x7F]/g, ''), 'en'));

    return totalChannels.keys().toArray().indexOf(channel.id);
}

export function parseUser(user: User | Snowflake) {
    let target: User | undefined;
    if (user instanceof User) {
        target = user;
    } else {
        target = client.users.cache.get(user);
        if (!target) return `<@${user}> (${user})`;
    }

    return `<@${target.id}> (${escapeMarkdown(target.username)} | ${target.id})`;
}

export function stringToFileName(alias: string) {
    return alias.replace(/[^a-z0-9]/gi, '_') + '.json';
}

export function formatContextURL(context: string | null | undefined) {
    return context || 'No context exists.';
}

export function trimString(str: string, n: number) {
    if (str.length > n - 3) return str.substring(0, n - 3) + '...';
    return str;
}

export function isValidUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

export function formatBytes(bytes: number, decimals: number = 2) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export function escapeXml(unsafe: string) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '&':
                return '&amp;';
            case "'":
                return '&apos;';
            case '"':
                return '&quot;';
            default:
                return '';
        }
    });
}

export function getMaximumUploadBytes(guild: Guild | null | undefined) {
    return [8388608, 52428800, 104857600][(guild?.premiumTier || 1) - 1] - 324;
}

export function getNumberWithOrdinalSuffix(n: number) {
    const mod10 = n % 10; // n >= 0
    const mod100 = Math.floor(n / 10) % 10;
    if (mod100 === 1) return n + 'th'; // all numbers between 10 and 20 are "th"

    return n + (['st', 'nd', 'rd'][mod10 - 1] ?? 'th');
}

export function getExpireTimestampCDN(rawURL: string): number | null {
    const url = new URL(rawURL);
    const hexUnixTimestamp = url.searchParams.get('ex');
    if (!hexUnixTimestamp) return null;

    const unixTimestamp = parseInt(hexUnixTimestamp, 16);
    if (isNaN(unixTimestamp)) return null;

    return unixTimestamp * 1000;
}

export function similarityLevenshtein(s1: string, s2: string) {
    // normalization form compatibility decomposition
    let longer = s1.normalize('NFKD');
    let shorter = s2.normalize('NFKD');

    if (longer.length < shorter.length) {
        [longer, shorter] = [shorter, longer];
    }

    if (longer.length === 0) return 1;
    return (longer.length - levenshteinDistance(longer, shorter)) / longer.length;
}

function levenshteinDistance(s: string, t: string) {
    const d: number[][] = [];

    const n = s.length;
    const m = t.length;

    if (n === 0) return m;
    if (m === 0) return n;

    for (let i = n; i >= 0; i--) d[i] = [];

    for (let i = n; i >= 0; i--) d[i][0] = i;
    for (let j = m; j >= 0; j--) d[0][j] = j;

    for (let i = 1; i <= n; i++) {
        const s_i = s.charAt(i - 1);

        for (let j = 1; j <= m; j++) {
            if (i === j && d[i][j] > 4) return n;

            const t_j = t.charAt(j - 1);
            const cost = s_i === t_j ? 0 : 1;

            d[i][j] = Math.min(
                d[i - 1][j] + 1, // deletion
                d[i][j - 1] + 1, // insertion
                d[i - 1][j - 1] + cost, // substitution
            );

            // transposition
            if (i > 1 && j > 1 && s_i === t.charAt(j - 2) && s.charAt(i - 2) === t_j) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
            }
        }
    }

    return d[n][m];
}
