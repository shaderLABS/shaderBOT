import { UserResolvable } from 'discord.js';
import { db } from '../../db/postgres.js';
import { client } from '../bot.js';
import automaticPunishment from './automaticPunishment.js';
import { sendInfo } from './embeds.js';
import log from './log.js';
import { formatContextURL, getGuild, parseUser } from './misc.js';
import { formatTimeDate } from './time.js';

export class Warning {
    public readonly id: string;
    public readonly userID: string;
    public readonly moderatorID?: string;
    public readonly timestamp: Date;

    public severity: 0 | 1 | 2 | 3;
    public reason: string;
    public contextURL?: string;
    public editTimestamp?: Date;
    public editModeratorID?: string;

    constructor(data: {
        id: string;
        user_id: string;
        severity: 0 | 1 | 2 | 3;
        mod_id?: string;
        reason: string;
        context_url?: string;
        edited_timestamp?: string | number | Date;
        edited_mod_id?: string;
        timestamp: string | number | Date;
    }) {
        this.id = data.id;
        this.userID = data.user_id;
        this.moderatorID = data.mod_id;
        this.timestamp = new Date(data.timestamp);
        this.severity = data.severity;
        this.reason = data.reason;
        this.contextURL = data.context_url;
        this.editTimestamp = data.edited_timestamp ? new Date(data.edited_timestamp) : undefined;
        this.editModeratorID = data.edited_mod_id;
    }

    static async getByUUID(uuid: string) {
        const result = await db.query(/*sql*/ `SELECT * FROM warn WHERE id = $1;`, [uuid]);
        if (result.rowCount === 0) return Promise.reject('A warning with the specified UUID does not exist.');
        return new Warning(result.rows[0]);
    }

    static async getLatestByUserID(userID: string) {
        const result = await db.query(/*sql*/ `SELECT * FROM warn WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1;`, [userID]);
        if (result.rowCount === 0) return Promise.reject('The specified user does not have any warnings.');
        return new Warning(result.rows[0]);
    }

    static async getAllByUserID(userID: string) {
        const result = await db.query(/*sql*/ `SELECT * FROM warn WHERE user_id = $1 ORDER BY timestamp DESC;`, [userID]);
        return result.rows.map((row) => new Warning(row));
    }

    public static async create(userResolvable: UserResolvable, severity: number, reason: string, moderatorID?: string, contextURL?: string) {
        if (severity !== 0 && severity !== 1 && severity !== 2 && severity !== 3) return Promise.reject('The warning severity must be an integer between 0 and 3');
        if (reason.length > 512) return Promise.reject('The warning reason must not be more than 512 characters long.');

        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        const user = await client.users.fetch(userResolvable).catch(() => undefined);
        if (!user) return Promise.reject('Failed to resolve the user.');

        const timestamp = new Date();

        const result = await db.query(
            /*sql*/ `
            INSERT INTO warn (user_id, mod_id, reason, context_url, severity, timestamp)
            VALUES ($1, $2, $3, $4, $5::SMALLINT, $6)
            RETURNING id;`,
            [user.id, moderatorID, reason, contextURL, severity, timestamp]
        );

        if (result.rowCount === 0) return Promise.reject('Failed to insert warning.');
        const { id } = result.rows[0];

        const warning = new Warning({
            id,
            reason,
            timestamp,
            severity,
            user_id: user.id,
            context_url: contextURL,
            mod_id: moderatorID,
        });

        let sentDM = true;
        await sendInfo(user, warning.toString(false), 'You have been warned in shaderLABS.').catch(() => {
            sentDM = false;
        });

        let logString = `${parseUser(warning.userID)} has been warned with a severity of ${warning.severity}.\n\n${warning.toString()}`;
        if (!sentDM) logString += '\n\n*They did not receive a DM.*';

        automaticPunishment(user);

        log(logString, 'Create Warning');
        return logString;
    }

    public async editSeverity(newSeverity: number, editModeratorID: string) {
        if (newSeverity !== 0 && newSeverity !== 1 && newSeverity !== 2 && newSeverity !== 3) return Promise.reject('The warning severity must be an integer between 0 and 3');
        if (this.severity === newSeverity) return Promise.reject(`The warning already has a severity of ${this.severity}.`);

        const oldSeverity = this.severity;
        const editTimestamp = new Date();

        const result = await db.query(
            /*sql*/ `
            UPDATE warn
            SET severity = $1, edited_timestamp = $2, edited_mod_id = $3
            WHERE id = $4`,
            [newSeverity, editTimestamp, editModeratorID, this.id]
        );
        if (result.rowCount === 0) return Promise.reject('Failed to edit the severity of the warning.');

        this.severity = newSeverity;
        this.editTimestamp = editTimestamp;
        this.editModeratorID = editModeratorID;

        const logString = `${parseUser(this.editModeratorID)} edited the severity of ${parseUser(this.userID)}'s warning (${this.id}).\n\n**Before**\n${oldSeverity}\n\n**After**\n${newSeverity}`;

        log(logString, 'Edit Warning Severity');
        return logString;
    }

    public async editReason(newReason: string, editModeratorID: string) {
        if (newReason.length > 512) return Promise.reject(`The warning reason must not be more than 512 characters long.`);

        const oldReason = this.reason;
        const editTimestamp = new Date();

        const result = await db.query(
            /*sql*/ `
            UPDATE warn
            SET reason = $1, edited_timestamp = $2, edited_mod_id = $3
            WHERE id = $4;`,
            [newReason, editTimestamp, editModeratorID, this.id]
        );
        if (result.rowCount === 0) return Promise.reject('Failed to edit the reason of the warning.');

        this.reason = newReason;
        this.editTimestamp = editTimestamp;
        this.editModeratorID = editModeratorID;

        const logString = `${parseUser(this.editModeratorID)} edited the reason of ${parseUser(this.userID)}'s warning (${this.id}).\n\n**Before**\n${oldReason}\n\n**After**\n${newReason}`;

        log(logString, 'Edit Warning Reason');
        return logString;
    }

    public async delete(moderatorID: string) {
        const result = await db.query(/*sql*/ `DELETE FROM warn WHERE id = $1;`, [this.id]);
        if (result.rowCount === 0) return Promise.reject('Failed to delete warning.');

        const logString = `${parseUser(moderatorID)} deleted ${parseUser(this.userID)}'s warning.\n\n${this.toString()}`;
        log(logString, 'Delete Warning');
        return logString;
    }

    public toString(includeUser: boolean = true) {
        let string = '';

        if (includeUser) {
            string += `**User:** ${parseUser(this.userID)}\n`;
        }

        string +=
            `**Severity:** ${this.severity}\n` +
            `**Reason:** ${this.reason}\n` +
            `**Moderator:** ${this.moderatorID ? parseUser(this.moderatorID) : 'System'}\n` +
            `**Context:** ${formatContextURL(this.contextURL)}\n` +
            `**Created At:** ${formatTimeDate(this.timestamp)}\n` +
            `**ID:** ${this.id}`;

        if (this.editTimestamp && this.editModeratorID) {
            string += `\n*(last edited by ${parseUser(this.editModeratorID)} at ${formatTimeDate(this.editTimestamp)})*`;
        }

        return string;
    }
}
