import type { UserResolvable } from 'discord.js';
import * as sql from 'drizzle-orm/sql';
import { db } from '../../../db/postgres.ts';
import * as schema from '../../../db/schema.ts';
import { client, timeoutStore } from '../../bot.ts';
import { BanAppeal } from '../banAppeal.ts';
import { sendInfo } from '../embeds.ts';
import log from '../log.ts';
import { getGuild, parseUser } from '../misc.ts';
import { formatTimeDate, secondsToString } from '../time.ts';
import { ExpirablePunishment, LiftedPunishment } from './main.ts';

export class Ban extends ExpirablePunishment {
    readonly TYPE_STRING: string = 'Ban';

    async refresh() {
        return await Ban.getByUUID(this.id);
    }

    static async has(userId: string): Promise<boolean> {
        const result = await db.query.ban.findFirst({ columns: {}, where: sql.eq(schema.ban.userId, userId) });
        return result !== undefined;
    }

    static async getByUUID(uuid: string) {
        const result = await db.query.ban.findFirst({ where: sql.eq(schema.ban.id, uuid) });
        if (!result) return Promise.reject('A ban with the specified UUID does not exist.');
        return new Ban(result);
    }

    static async getByUserID(userId: string) {
        const result = await db.query.ban.findFirst({ where: sql.eq(schema.ban.userId, userId) });
        if (!result) return Promise.reject('The specified user does not have any past bans.');
        return new Ban(result);
    }

    static async getExpiringToday() {
        const result = await db.query.ban.findMany({
            where: sql.and(sql.isNotNull(schema.ban.expireTimestamp), sql.lte(sql.sql`${schema.ban.expireTimestamp}::DATE`, sql.sql`NOW()::DATE`)),
        });

        return result.map((entry) => new Ban(entry));
    }

    static async getExpiringTomorrow() {
        const result = await db.query.ban.findMany({
            where: sql.and(sql.isNotNull(schema.ban.expireTimestamp), sql.lte(sql.sql`${schema.ban.expireTimestamp}::DATE`, sql.sql`NOW()::DATE + INTERVAL '1 day'`)),
        });

        return result.map((entry) => new Ban(entry));
    }

    public static async create(
        userResolvable: UserResolvable,
        reason: string,
        duration: number | null = null,
        moderatorId: string | null = null,
        contextUrl: string | null = null,
        deleteMessageSeconds?: number,
    ) {
        if (duration) {
            if (isNaN(duration)) return Promise.reject('The specified duration is not a number or exc,eeds the range of UNIX time.');
            if (duration < 10) return Promise.reject("You can't ban someone for less than 10 seconds.");
        }

        if (reason.length > 512) return Promise.reject('The ban reason must not be more than 512 characters long.');

        const guild = getGuild();

        const user = await client.users.fetch(userResolvable).catch(() => undefined);
        if (!user) return Promise.reject('Failed to resolve the user.');

        const overwrittenBan = await Ban.getByUserID(user.id).catch(() => undefined);
        await overwrittenBan?.move(moderatorId);

        const timestamp = new Date();
        const expireTimestamp = duration ? new Date(timestamp.getTime() + duration * 1000) : null;

        const data = {
            userId: user.id,
            moderatorId,
            reason,
            contextUrl,
            expireTimestamp,
            timestamp,
        } satisfies typeof schema.ban.$inferInsert;

        const result = await db.insert(schema.ban).values(data).returning({ id: schema.ban.id });

        if (result.length === 0) return Promise.reject('Failed to insert ban entry.');
        const { id } = result[0];

        const ban = new Ban({
            id,
            editModeratorId: null,
            editTimestamp: null,
            ...data,
        });

        let sentDM = true;
        await sendInfo(user, ban.toString(false), `You have been banned from ${guild.name}.`).catch(() => {
            sentDM = false;
        });

        if (await guild.bans.fetch(user).catch(() => undefined)) {
            // is banned
            if (deleteMessageSeconds) {
                await guild.members.unban(user, 'Rebanning an already banned user in order to delete their messages.');
                await guild.members.ban(user, { reason, deleteMessageSeconds });
            }
        } else {
            // is not banned
            await guild.members.ban(user, { reason, deleteMessageSeconds });
        }

        timeoutStore.set(ban, true);

        let logString = `${parseUser(user)} has been ${duration ? `temporarily banned for ${secondsToString(duration)}.` : 'permanently banned.'}\n\n${ban.toString()}`;
        if (overwrittenBan) logString += '\n\nTheir previous ban has been overwritten:\n' + overwrittenBan.toString();
        if (!sentDM) logString += '\n\n*They did not receive a DM.*';

        log(logString, duration ? 'Temporary Ban' : 'Permanent Ban');
        return logString;
    }

    private async move(liftedModeratorId: string | null = null) {
        const liftedBan = LiftedBan.fromBan(this, liftedModeratorId);

        const deleteResult = await db.delete(schema.ban).where(sql.eq(schema.ban.id, liftedBan.id));
        if (deleteResult.rowCount === 0) return Promise.reject('Failed to delete ban entry.');

        const createResult = await db.insert(schema.liftedBan).values(liftedBan);
        if (createResult.rowCount === 0) return Promise.reject('Failed to insert lifted ban entry.');

        timeoutStore.delete(this);
        return liftedBan;
    }

    public async lift(liftedModeratorID?: string): Promise<string> {
        const guild = getGuild();
        const liftedBan = await this.move(liftedModeratorID);

        await guild.members.unban(this.userId).catch(() => undefined);

        let logString = `${parseUser(this.userId)} has been unbanned.`;
        if (this.expireTimestamp) logString += `\nTheir temporary ban would have expired at ${formatTimeDate(this.expireTimestamp)}.`;
        logString += '\n\n' + liftedBan.toString();

        log(logString, 'Unban');
        return logString;
    }

    public async expire() {
        const guild = getGuild();

        try {
            await this.move();

            await guild.members.unban(this.userId).catch(() => undefined);

            const appeal = await BanAppeal.getPendingByUserID(this.userId).catch(() => undefined);
            if (appeal) await appeal.expire();

            log(`${parseUser(this.userId)}'s temporary ban (${this.id}) has expired.`, 'Expire Temporary Ban');
        } catch (error) {
            console.error(error);
            log(`An error occurred while trying to expire ${parseUser(this.userId)}'s temporary ban (${this.id}).`, 'Expire Temporary Ban');
        }
    }

    public async editDuration(duration: number, editModeratorId: string) {
        if (isNaN(duration)) return Promise.reject('The specified duration is not a number or exceeds the range of UNIX time.');
        if (duration < 10) return Promise.reject("You can't ban someone for less than 10 seconds.");

        const oldExpireTimestamp = this.expireTimestamp;
        const newExpireTimestamp = new Date(this.timestamp.getTime() + duration * 1000);

        const editTimestamp = new Date();

        const result = await db
            .update(schema.ban)
            .set({
                expireTimestamp: newExpireTimestamp,
                editTimestamp,
                editModeratorId,
            })
            .where(sql.eq(schema.ban.id, this.id));

        if (result.rowCount === 0) return Promise.reject('Failed to edit the duration of the ban.');

        this.expireTimestamp = newExpireTimestamp;
        this.editTimestamp = editTimestamp;
        this.editModeratorId = editModeratorId;

        timeoutStore.delete(this);
        timeoutStore.set(this, true);

        const logString = `${parseUser(this.editModeratorId)} edited the expiry date of ${parseUser(this.userId)}'s current ban (${this.id}).\n\n**Before**\n${
            oldExpireTimestamp ? formatTimeDate(oldExpireTimestamp) + ` (${secondsToString((oldExpireTimestamp.getTime() - this.timestamp.getTime()) / 1000)})` : 'Permanent'
        }\n\n**After**\n${formatTimeDate(newExpireTimestamp)} (${secondsToString((newExpireTimestamp.getTime() - this.timestamp.getTime()) / 1000)})`;

        log(logString, 'Edit Ban Duration');
        return logString;
    }

    public async editReason(newReason: string, editModeratorId: string) {
        if (newReason.length > 512) return Promise.reject('The ban reason must not be more than 512 characters long.');

        const oldReason = this.reason;
        const editTimestamp = new Date();

        const result = await db
            .update(schema.ban)
            .set({
                reason: newReason,
                editTimestamp,
                editModeratorId,
            })
            .where(sql.eq(schema.ban.id, this.id));

        if (result.rowCount === 0) return Promise.reject('Failed to edit the reason of the ban.');

        this.reason = newReason;
        this.editTimestamp = editTimestamp;
        this.editModeratorId = editModeratorId;

        const logString = `${parseUser(this.editModeratorId)} edited the reason of ${parseUser(this.userId)}'s current ban (${this.id}).\n\n**Before**\n${oldReason}\n\n**After**\n${newReason}`;

        log(logString, 'Edit Ban Reason');
        return logString;
    }
}

export class LiftedBan extends LiftedPunishment {
    readonly TYPE_STRING: string = 'Lifted Ban';

    public static fromBan(ban: Ban, liftedModeratorId: string | null = null) {
        return new LiftedBan({
            id: ban.id,
            userId: ban.userId,
            moderatorId: ban.moderatorId,
            reason: ban.reason,
            contextUrl: ban.contextUrl,
            editTimestamp: ban.editTimestamp,
            editModeratorId: ban.editModeratorId,
            liftedTimestamp: new Date(),
            liftedModeratorId,
            timestamp: ban.timestamp,
        });
    }

    // TODO: consider using prepared statements
    // private static readonly QUERY_GET_BY_UUID = ...;

    static async getByUUID(uuid: string) {
        const result = await db.query.liftedBan.findFirst({ where: sql.eq(schema.liftedBan.id, uuid) });
        if (!result) return Promise.reject('A lifted ban with the specified UUID does not exist.');
        return new LiftedBan(result);
    }

    static async getLatestByUserID(userId: string) {
        const result = await db.query.liftedBan.findFirst({
            where: sql.eq(schema.liftedBan.userId, userId),
            orderBy: sql.desc(schema.liftedBan.timestamp),
        });

        if (!result) return Promise.reject('The specified user does not have any lifted bans.');
        return new LiftedBan(result);
    }

    static async getAllByUserID(userId: string) {
        const result = await db.query.liftedBan.findMany({
            where: sql.eq(schema.liftedBan.userId, userId),
            orderBy: sql.desc(schema.liftedBan.timestamp),
        });

        return result.map((entry) => new LiftedBan(entry));
    }

    public async editReason(newReason: string, editModeratorId: string) {
        if (newReason.length > 512) return Promise.reject('The ban reason must not be more than 512 characters long.');

        const oldReason = this.reason;
        const editTimestamp = new Date();

        const result = await db
            .update(schema.liftedBan)
            .set({
                reason: newReason,
                editTimestamp,
                editModeratorId,
            })
            .where(sql.eq(schema.liftedBan.id, this.id));

        if (result.rowCount === 0) return Promise.reject('Failed to edit the reason of the lifted ban.');

        this.reason = newReason;
        this.editTimestamp = editTimestamp;
        this.editModeratorId = editModeratorId;

        const logString = `${parseUser(this.editModeratorId)} edited the reason of ${parseUser(this.userId)}'s lifted ban (${this.id}).\n\n**Before**\n${oldReason}\n\n**After**\n${newReason}`;

        log(logString, 'Edit Lifted Ban Reason');
        return logString;
    }

    public async delete(moderatorId: string) {
        const result = await db.delete(schema.liftedBan).where(sql.eq(schema.liftedBan.id, this.id));
        if (result.rowCount === 0) return Promise.reject('Failed to delete lifted ban.');

        const logString = `${parseUser(moderatorId)} deleted the log entry of ${parseUser(this.userId)}'s lifted ban.\n\n${this.toString(true)}`;
        log(logString, 'Delete Lifted Ban Entry');
        return logString;
    }
}
