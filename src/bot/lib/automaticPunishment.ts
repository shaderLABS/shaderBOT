import { User } from 'discord.js';
import { db } from '../../db/postgres';
import { settings } from '../bot';

export default async function (user: User) {
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
    for (const warning of warnings) {
        if (warning.severity !== 0) punishmentPoints += warningToPoints(warning.severity, new Date(warning.timestamp));
    }
}

function warningToPoints(severity: number, timestamp: Date) {
    const elapsedTime = Date.now() - timestamp.getTime();
    const scale = elapsedTime / settings.warnings.halflives[severity - 1];
    return severity / (scale * scale + 1.0);
}
