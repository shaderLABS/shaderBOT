import { User } from 'discord.js';
import { db } from '../../db/postgres.js';
import { settings } from '../bot.js';
import log from './log.js';
import { parseUser } from './misc.js';
import { Punishment } from './punishment.js';

function interpolateTime(range: number[], values: number[], punishmentPoints: number) {
    return values[0] + ((values[1] - values[0]) * (punishmentPoints - range[0])) / (range[1] - range[0]);
}

function warningToPoints(severity: number, passedMS: number) {
    const elapsedDays = Math.floor((Date.now() - passedMS) / 86400000);
    const scale = elapsedDays / settings.data.warnings.decay[severity - 1];
    return severity / (scale + 1.0);
}

export async function getPunishmentPoints(userID: string) {
    const warnings = (
        await db.query(
            /*sql*/ `
            SELECT severity, timestamp
            FROM warn
            WHERE severity > 0 AND user_id = $1;`,
            [userID]
        )
    ).rows;

    if (warnings.length === 0) return 0;

    const excludedTimes = await Promise.all(
        warnings.map((warning) =>
            db.query(
                /*sql*/ `
                SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (lifted_timestamp - timestamp))), 0) AS exclude
                FROM past_punishment
                WHERE ("type" = 'ban' OR "type" = 'mute') AND lifted_timestamp IS NOT NULL AND timestamp >= $1::TIMESTAMP AND user_id = $2;`,
                [new Date(warning.timestamp), userID]
            )
        )
    );

    const points: number = warnings.reduce((prev, curr, i) => prev + warningToPoints(curr.severity, new Date(curr.timestamp).getTime() + excludedTimes[i].rows[0].exclude * 1000), 0);
    return Math.round(points * 1000) / 1000;
}

export default async function (user: User) {
    const punishmentPoints = await getPunishmentPoints(user.id);
    if (punishmentPoints === 0) return 0;

    try {
        if (punishmentPoints >= settings.data.warnings.punishment.muteRange[0] && punishmentPoints < settings.data.warnings.punishment.muteRange[1]) {
            const duration = interpolateTime(settings.data.warnings.punishment.muteRange, settings.data.warnings.punishment.muteValues, punishmentPoints);
            await Punishment.createMute(user, 'Too many warnings.', duration);
            return 1;
        } else if (punishmentPoints >= settings.data.warnings.punishment.tempbanRange[0] && punishmentPoints < settings.data.warnings.punishment.tempbanRange[1]) {
            const duration = interpolateTime(settings.data.warnings.punishment.tempbanRange, settings.data.warnings.punishment.tempbanValues, punishmentPoints);
            await Punishment.createBan(user, 'Too many warnings.', duration);
            return 2;
        } else if (punishmentPoints >= settings.data.warnings.punishment.ban) {
            await Punishment.createBan(user, 'Too many warnings.');
            return 3;
        }
    } catch (error) {
        log(`Failed to auto-punish ${parseUser(user)}:\n` + error, 'Automatic Punishment');
    }

    return 0;
}
