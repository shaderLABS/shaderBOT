import { User } from 'discord.js';
import { db } from '../../db/postgres.js';
import { settings } from '../bot.js';
import log from './log.js';
import { parseUser } from './misc.js';
import { Ban } from './punishment/ban.js';
import { Mute } from './punishment/mute.js';

function interpolateTime(range: number[], values: number[], punishmentPoints: number) {
    return values[0] + ((values[1] - values[0]) * (punishmentPoints - range[0])) / (range[1] - range[0]);
}

function warningToPoints(severity: number, passedMS: number) {
    const elapsedDays = Math.floor((Date.now() - passedMS) / 86_400_000); // 1d = 86,400,000ms
    const scale = elapsedDays / settings.data.warnings.decay[severity - 1];
    return ((1 - settings.data.warnings.decay_minimum) / (scale + 1) + settings.data.warnings.decay_minimum) * severity;
}

export async function getPunishmentPoints(userID: string) {
    const warnings = (
        await db.query({
            text: /*sql*/ `
                SELECT severity, timestamp
                FROM warn
                WHERE severity > 0 AND user_id = $1;`,
            values: [userID],
            name: 'punishment-points-total-severity',
        })
    ).rows;

    if (warnings.length === 0) return 0;

    const excludedTimes = await Promise.all(
        warnings.map((warning) =>
            db.query({
                text: /*sql*/ `
                    SELECT (
                        (
                            SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (lifted_timestamp - GREATEST(timestamp, $1::TIMESTAMP)))), 0)
                            FROM lifted_ban
                            WHERE lifted_timestamp >= $1::TIMESTAMP AND user_id = $2
                        ) + (
                            SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (lifted_timestamp - GREATEST(timestamp, $1::TIMESTAMP)))), 0)
                            FROM lifted_mute
                            WHERE lifted_timestamp >= $1::TIMESTAMP AND user_id = $2
                        ) + (
                            SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (NOW() - GREATEST(timestamp, $1::TIMESTAMP)))), 0)
                            FROM ban
                            WHERE user_id = $2
                        ) + (
                            SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (NOW() - GREATEST(timestamp, $1::TIMESTAMP)))), 0)
                            FROM mute
                            WHERE user_id = $2
                        )
                    ) AS excluded_time;
                `,
                values: [new Date(warning.timestamp), userID],
                name: 'punishment-points-total-excluded-time',
            })
        )
    );

    const points: number = warnings.reduce((total, warning, index) => {
        const { excluded_time }: { excluded_time: number } = excludedTimes[index].rows[0];
        return total + warningToPoints(warning.severity, new Date(warning.timestamp).getTime() + excluded_time * 1000.0);
    }, 0);

    return Math.round(points * 1000) / 1000;
}

export default async function (user: User) {
    const punishmentPoints = await getPunishmentPoints(user.id);
    if (punishmentPoints === 0) return 0;

    try {
        if (punishmentPoints >= settings.data.warnings.punishment.muteRange[0] && punishmentPoints < settings.data.warnings.punishment.muteRange[1]) {
            const duration = interpolateTime(settings.data.warnings.punishment.muteRange, settings.data.warnings.punishment.muteValues, punishmentPoints);
            await Mute.create(user, 'Too many warnings.', duration);
            return 1;
        } else if (punishmentPoints >= settings.data.warnings.punishment.tempbanRange[0] && punishmentPoints < settings.data.warnings.punishment.tempbanRange[1]) {
            const duration = interpolateTime(settings.data.warnings.punishment.tempbanRange, settings.data.warnings.punishment.tempbanValues, punishmentPoints);
            await Ban.create(user, 'Too many warnings.', duration);
            return 2;
        } else if (punishmentPoints >= settings.data.warnings.punishment.ban) {
            await Ban.create(user, 'Too many warnings.');
            return 3;
        }
    } catch (error) {
        log(`Failed to auto-punish ${parseUser(user)}:\n` + error, 'Automatic Punishment');
    }

    return 0;
}
