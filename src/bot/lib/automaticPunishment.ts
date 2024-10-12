import { User } from 'discord.js';
import * as sql from 'drizzle-orm/sql';
import { db, dialect } from '../../db/postgres.ts';
import * as schema from '../../db/schema.ts';
import { settings } from '../bot.ts';
import log from './log.ts';
import { parseUser } from './misc.ts';
import { Ban } from './punishment/ban.ts';
import { Mute } from './punishment/mute.ts';

function interpolateTime(range: number[], values: number[], punishmentPoints: number) {
    return values[0] + ((values[1] - values[0]) * (punishmentPoints - range[0])) / (range[1] - range[0]);
}

function warningToPoints(severity: 0 | 1 | 2 | 3, passedMS: number) {
    const elapsedDays = Math.floor((Date.now() - passedMS) / 86_400_000); // 1d = 86,400,000ms
    const scale = elapsedDays / settings.data.warnings.decay[severity - 1];
    return ((1 - settings.data.warnings.decay_minimum) / (scale + 1) + settings.data.warnings.decay_minimum) * severity;
}

const QUERY_STRING = dialect.sqlToQuery(
    sql.sql`
        SELECT (
            (
                SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (${schema.liftedBan.liftedTimestamp} - GREATEST(${schema.liftedBan.timestamp}, $1)))), 0)
                FROM ${schema.liftedBan}
                WHERE ${schema.liftedBan.liftedTimestamp} >= $1 AND ${schema.liftedBan.userId} = $2
            ) + (
                SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (${schema.liftedMute.liftedTimestamp} - GREATEST(${schema.liftedMute.timestamp}, $1)))), 0)
                FROM ${schema.liftedMute}
                WHERE ${schema.liftedMute.liftedTimestamp} >= $1 AND ${schema.liftedMute.userId} = $2
            ) + (
                SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (NOW() - GREATEST(${schema.ban.timestamp}, $1)))), 0)
                FROM ${schema.ban}
                WHERE ${schema.ban.userId} = $2
            ) + (
                SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (NOW() - GREATEST(${schema.mute.timestamp}, $1)))), 0)
                FROM ${schema.mute}
                WHERE ${schema.mute.userId} = $2
            )
        ) AS excludedTime;`,
).sql;

export async function getPunishmentPoints(userId: string) {
    const warnings = await db.query.warn.findMany({
        columns: { severity: true, timestamp: true },
        where: sql.and(sql.gt(schema.warn.severity, 0), sql.eq(schema.warn.userId, userId)),
    });

    if (warnings.length === 0) return 0;

    const excludedTimes = await Promise.all(
        warnings.map((warning) =>
            db.$client.query<{ excludedTime: number }>({
                text: QUERY_STRING,
                values: [warning.timestamp, userId],
                name: 'punishment-points-total-excluded-time',
            }),
        ),
    );

    const points: number = warnings.reduce((total, warning, index) => {
        const { excludedTime } = excludedTimes[index].rows[0];
        return total + warningToPoints(warning.severity, warning.timestamp.getTime() + excludedTime * 1000.0);
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
