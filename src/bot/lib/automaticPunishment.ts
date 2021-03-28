import { GuildMember, User } from 'discord.js';
import { db } from '../../db/postgres.js';
import { settings } from '../bot.js';
import { ban, tempban } from './banUser.js';
import log from './log.js';
import { mute } from './muteUser.js';

export default async function (user: User, member?: GuildMember) {
    const warnings = (
        await db.query(
            /*sql*/ `
            SELECT severity, timestamp
            FROM warn
            WHERE user_id = $1;`,
            [user.id]
        )
    ).rows;

    let punishmentPoints = 0;
    warnings.forEach((warning) => {
        if (warning.severity !== 0) punishmentPoints += warningToPoints(warning.severity, new Date(warning.timestamp));
    });

    try {
        if (punishmentPoints >= settings.warnings.punishment.muteRange[0] && punishmentPoints < settings.warnings.punishment.muteRange[1]) {
            const duration = interpolateTime(settings.warnings.punishment.muteRange, settings.warnings.punishment.muteValues, punishmentPoints);
            mute(user.id, duration, null, 'Too many warnings.', member);
        } else if (punishmentPoints >= settings.warnings.punishment.tempbanRange[0] && punishmentPoints < settings.warnings.punishment.tempbanRange[1]) {
            const duration = interpolateTime(settings.warnings.punishment.tempbanRange, settings.warnings.punishment.tempbanValues, punishmentPoints);
            tempban(user, duration, null, 'Too many warnings.', false);
        } else if (punishmentPoints >= settings.warnings.punishment.ban) {
            ban(user, null, 'Too many warnings.', false);
        }
    } catch (error) {
        log(`Failed to auto-punish <@${user.id}>:\n` + error);
    }
}

function interpolateTime(range: number[], values: number[], punishmentPoints: number) {
    return values[0] + ((values[1] - values[0]) * (punishmentPoints - range[0])) / (range[1] - range[0]);
}

function warningToPoints(severity: number, timestamp: Date) {
    const elapsedDays = Math.floor((Date.now() - timestamp.getTime()) / 86400000);
    const scale = elapsedDays / settings.warnings.decay[severity - 1];
    return severity / (scale + 1.0);
}
