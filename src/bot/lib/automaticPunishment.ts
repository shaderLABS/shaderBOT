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
            name: 'warn-points-total-severity',
        })
    ).rows;

    if (warnings.length === 0) return 0;

    const excludedTimes = await Promise.all(
        warnings.map((warning) =>
            db.query({
                text: /*sql*/ `
                    SELECT (
                        SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (lifted_timestamp - GREATEST(timestamp, $1::TIMESTAMP)))), 0)
                        FROM past_punishment
                        WHERE ("type" = 'ban' OR "type" = 'mute') AND lifted_timestamp IS NOT NULL AND lifted_timestamp >= $1::TIMESTAMP AND user_id = $2
                    ) AS past_exclude, (
                        SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (NOW() - GREATEST(timestamp, $1::TIMESTAMP)))), 0)
                        FROM punishment
                        WHERE ("type" = 'ban' OR "type" = 'mute') AND user_id = $2
                    ) AS exclude;`,
                values: [new Date(warning.timestamp), userID],
                name: 'past-punishment-points-total-punished-time',
            })
        )
    );

    const points: number = warnings.reduce((total, warning, index) => {
        const { exclude, past_exclude }: { exclude: number; past_exclude: number } = excludedTimes[index].rows[0];
        return total + warningToPoints(warning.severity, new Date(warning.timestamp).getTime() + exclude * 1000.0 + past_exclude * 1000.0);
    }, 0);

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
