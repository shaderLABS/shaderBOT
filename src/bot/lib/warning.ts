import type { UserResolvable } from 'discord.js';
import * as sql from 'drizzle-orm/sql';
import { db } from '../../db/postgres.ts';
import * as schema from '../../db/schema.ts';
import { client } from '../bot.ts';
import automaticPunishment from './automaticPunishment.ts';
import { sendInfo } from './embeds.ts';
import log from './log.ts';
import { formatContextURL, getGuild, parseUser } from './misc.ts';
import { formatTimeDate } from './time.ts';

export class Warning {
    public readonly id: string;
    public readonly userId: string;
    public readonly moderatorId: string;
    public readonly timestamp: Date;

    public severity: 0 | 1 | 2 | 3;
    public reason: string;
    public contextUrl?: string | null;
    public editTimestamp?: Date | null;
    public editModeratorId?: string | null;

    constructor(data: typeof schema.warn.$inferSelect) {
        this.id = data.id;
        this.userId = data.userId;
        this.moderatorId = data.moderatorId;
        this.timestamp = data.timestamp;
        this.severity = data.severity;
        this.reason = data.reason;
        this.contextUrl = data.contextUrl;
        this.editTimestamp = data.editTimestamp;
        this.editModeratorId = data.editModeratorId;
    }

    static async getByUUID(uuid: string) {
        const result = await db.query.warn.findFirst({ where: sql.eq(schema.warn.id, uuid) });
        if (!result) return Promise.reject('A warning with the specified UUID does not exist.');
        return new Warning(result);
    }

    static async getLatestByUserID(userId: string) {
        const result = await db.query.warn.findFirst({
            where: sql.eq(schema.warn.userId, userId),
            orderBy: sql.desc(schema.warn.timestamp),
        });
        if (!result) return Promise.reject('The specified user does not have any warnings.');
        return new Warning(result);
    }

    static async getAllByUserID(userId: string) {
        const result = await db.query.warn.findMany({
            where: sql.eq(schema.warn.userId, userId),
            orderBy: sql.desc(schema.warn.timestamp),
        });
        return result.map((entry) => new Warning(entry));
    }

    public static async create(userResolvable: UserResolvable, severity: number, reason: string, moderatorId: string, contextUrl: string | null = null) {
        if (severity !== 0 && severity !== 1 && severity !== 2 && severity !== 3) return Promise.reject('The warning severity must be an integer between 0 and 3');
        if (reason.length > 512) return Promise.reject('The warning reason must not be more than 512 characters long.');

        const guild = getGuild();

        const user = await client.users.fetch(userResolvable).catch(() => undefined);
        if (!user) return Promise.reject('Failed to resolve the user.');

        const data = {
            userId: user.id,
            moderatorId,
            reason,
            contextUrl,
            severity,
            timestamp: new Date(),
        } satisfies typeof schema.warn.$inferInsert;

        const result = await db.insert(schema.warn).values(data).returning({ id: schema.warn.id });

        if (result.length === 0) return Promise.reject('Failed to insert warning.');
        const { id } = result[0];

        const warning = new Warning({
            id,
            editModeratorId: null,
            editTimestamp: null,
            ...data,
        });

        let sentDM = true;
        await sendInfo(user, {
            description: warning.toString(false),
            title: `You have been warned in ${guild.name}.`,
        }).catch(() => {
            sentDM = false;
        });

        let logString = `${parseUser(warning.userId)} has been warned with a severity of ${warning.severity}.\n\n${warning.toString()}`;
        if (!sentDM) logString += '\n\n*They did not receive a DM.*';

        automaticPunishment(user);

        log(logString, 'Create Warning');
        return logString;
    }

    public async editSeverity(newSeverity: number, editModeratorId: string) {
        if (newSeverity !== 0 && newSeverity !== 1 && newSeverity !== 2 && newSeverity !== 3) return Promise.reject('The warning severity must be an integer between 0 and 3');
        if (this.severity === newSeverity) return Promise.reject(`The warning already has a severity of ${this.severity}.`);

        const oldSeverity = this.severity;
        const editTimestamp = new Date();

        const result = await db
            .update(schema.warn)
            .set({
                severity: newSeverity,
                editTimestamp,
                editModeratorId,
            })
            .where(sql.eq(schema.warn.id, this.id));

        if (result.rowCount === 0) return Promise.reject('Failed to edit the severity of the warning.');

        this.severity = newSeverity;
        this.editTimestamp = editTimestamp;
        this.editModeratorId = editModeratorId;

        const logString = `${parseUser(this.editModeratorId)} edited the severity of ${parseUser(this.userId)}'s warning (${this.id}).\n\n**Before**\n${oldSeverity}\n\n**After**\n${newSeverity}`;

        log(logString, 'Edit Warning Severity');
        return logString;
    }

    public async editReason(newReason: string, editModeratorId: string) {
        if (newReason.length > 512) return Promise.reject(`The warning reason must not be more than 512 characters long.`);

        const oldReason = this.reason;
        const editTimestamp = new Date();

        const result = await db
            .update(schema.warn)
            .set({
                reason: newReason,
                editTimestamp,
                editModeratorId,
            })
            .where(sql.eq(schema.warn.id, this.id));

        if (result.rowCount === 0) return Promise.reject('Failed to edit the reason of the warning.');

        this.reason = newReason;
        this.editTimestamp = editTimestamp;
        this.editModeratorId = editModeratorId;

        const logString = `${parseUser(this.editModeratorId)} edited the reason of ${parseUser(this.userId)}'s warning (${this.id}).\n\n**Before**\n${oldReason}\n\n**After**\n${newReason}`;

        log(logString, 'Edit Warning Reason');
        return logString;
    }

    public async delete(moderatorID: string) {
        const result = await db.delete(schema.warn).where(sql.eq(schema.warn.id, this.id));
        if (result.rowCount === 0) return Promise.reject('Failed to delete warning.');

        const logString = `${parseUser(moderatorID)} deleted ${parseUser(this.userId)}'s warning.\n\n${this.toString()}`;
        log(logString, 'Delete Warning');
        return logString;
    }

    public toString(includeUser: boolean = true) {
        let string = '';

        if (includeUser) {
            string += `**User:** ${parseUser(this.userId)}\n`;
        }

        string +=
            `**Severity:** ${this.severity}\n` +
            `**Reason:** ${this.reason}\n` +
            `**Moderator:** ${this.moderatorId ? parseUser(this.moderatorId) : 'System'}\n` +
            `**Context:** ${formatContextURL(this.contextUrl)}\n` +
            `**Created At:** ${formatTimeDate(this.timestamp)}\n` +
            `**ID:** ${this.id}`;

        if (this.editTimestamp && this.editModeratorId) {
            string += `\n*(last edited by ${parseUser(this.editModeratorId)} at ${formatTimeDate(this.editTimestamp)})*`;
        }

        return string;
    }
}
