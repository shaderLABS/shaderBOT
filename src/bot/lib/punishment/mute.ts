import { type UserResolvable } from 'discord.js';
import * as sql from 'drizzle-orm/sql';
import { db } from '../../../db/postgres.ts';
import * as schema from '../../../db/schema.ts';
import { client, timeoutStore } from '../../bot.ts';
import { sendInfo } from '../embeds.ts';
import log from '../log.ts';
import { getGuild, parseUser, userToMember } from '../misc.ts';
import { formatTimeDate, secondsToString } from '../time.ts';
import { ExpirablePunishment, LiftedPunishment } from './main.ts';

export class Mute extends ExpirablePunishment {
    readonly TYPE_STRING: string = 'Mute';

    declare expireTimestamp: Date;

    async refresh() {
        return await Mute.getByUUID(this.id);
    }

    static async has(userId: string): Promise<boolean> {
        const result = await db.query.mute.findFirst({
            columns: { id: true },
            where: sql.eq(schema.mute.userId, userId),
        });
        return result !== undefined;
    }

    static async getByUUID(uuid: string) {
        const result = await db.query.mute.findFirst({ where: sql.eq(schema.mute.id, uuid) });
        if (!result) return Promise.reject('A mute with the specified UUID does not exist.');
        return new Mute(result);
    }

    static async getByUserID(userId: string) {
        const result = await db.query.mute.findFirst({ where: sql.eq(schema.mute.userId, userId) });
        if (!result) return Promise.reject('The specified user does not have any past mutes.');
        return new Mute(result);
    }

    static async getExpiringToday() {
        const result = await db.query.mute.findMany({
            where: sql.and(sql.isNotNull(schema.mute.expireTimestamp), sql.lte(sql.sql`${schema.mute.expireTimestamp}::DATE`, sql.sql`NOW()::DATE`)),
        });

        return result.map((entry) => new Mute(entry));
    }

    static async getExpiringTomorrow() {
        const result = await db.query.mute.findMany({
            where: sql.and(sql.isNotNull(schema.mute.expireTimestamp), sql.lte(sql.sql`${schema.mute.expireTimestamp}::DATE`, sql.sql`NOW()::DATE + INTERVAL '1 day'`)),
        });

        return result.map((entry) => new Mute(entry));
    }

    private async move(liftedModeratorId: string | null = null) {
        const liftedMute = LiftedMute.fromMute(this, liftedModeratorId);

        const deleteResult = await db.delete(schema.mute).where(sql.eq(schema.mute.id, liftedMute.id));
        if (deleteResult.rowCount === 0) return Promise.reject('Failed to delete mute entry.');

        const createResult = await db.insert(schema.liftedMute).values(liftedMute);
        if (createResult.rowCount === 0) return Promise.reject('Failed to insert lifted mute entry.');

        timeoutStore.delete(this);
        return liftedMute;
    }

    public async lift(liftedModeratorID?: string): Promise<string> {
        const guild = getGuild();
        const pastPunishment = await this.move(liftedModeratorID);

        const member = await userToMember(this.userId, guild);
        if (member) member.timeout(null);

        let logString = `${parseUser(this.userId)} has been unmuted.`;
        if (this.expireTimestamp) logString += `\nTheir mute would have expired at ${formatTimeDate(this.expireTimestamp)}.`;
        logString += '\n\n' + pastPunishment.toString();

        log(logString, 'Unmute');
        return logString;
    }

    public async expire() {
        try {
            await this.move();

            // timeout is lifted by discord
            log(`${parseUser(this.userId)}'s mute (${this.id}) has expired.\n\n${this.toString()}`, 'Expire Mute');
        } catch (error) {
            console.error(error);
            log(`An error occurred while trying to expire ${parseUser(this.userId)}'s mute (${this.id}).`, 'Expire Mute');
        }
    }

    public async editDuration(duration: number, editModeratorId: string) {
        if (isNaN(duration)) return Promise.reject('The specified duration is not a number or exceeds the range of UNIX time.');
        if (duration < 10) return Promise.reject("You can't mute someone for less than 10 seconds.");
        if (duration > 2419200) return Promise.reject("You can't mute someone for more than 28 days.");

        const oldExpireTimestamp = this.expireTimestamp;
        const newExpireTimestamp = new Date(this.timestamp.getTime() + duration * 1000);

        const editTimestamp = new Date();

        const result = await db
            .update(schema.mute)
            .set({
                expireTimestamp: newExpireTimestamp,
                editTimestamp,
                editModeratorId,
            })
            .where(sql.eq(schema.mute.id, this.id));

        if (result.rowCount === 0) return Promise.reject('Failed to edit the duration of the mute.');

        this.expireTimestamp = newExpireTimestamp;
        this.editTimestamp = editTimestamp;
        this.editModeratorId = editModeratorId;

        const member = await userToMember(this.userId);
        if (member) member.disableCommunicationUntil(this.expireTimestamp);

        timeoutStore.delete(this);
        timeoutStore.set(this, true);

        const logString = `${parseUser(this.editModeratorId)} edited the expiry date of ${parseUser(this.userId)}'s current mute (${this.id}).\n\n**Before**\n${
            formatTimeDate(oldExpireTimestamp) + ` (${secondsToString((oldExpireTimestamp.getTime() - this.timestamp.getTime()) / 1000)})`
        }\n\n**After**\n${formatTimeDate(newExpireTimestamp)} (${secondsToString((newExpireTimestamp.getTime() - this.timestamp.getTime()) / 1000)})`;

        log(logString, 'Edit Mute Duration');
        return logString;
    }

    public async editReason(newReason: string, editModeratorId: string) {
        if (newReason.length > 512) return Promise.reject('The mute reason must not be more than 512 characters long.');

        const oldReason = this.reason;
        const editTimestamp = new Date();

        const result = await db
            .update(schema.mute)
            .set({
                reason: newReason,
                editTimestamp,
                editModeratorId,
            })
            .where(sql.eq(schema.mute.id, this.id));

        if (result.rowCount === 0) return Promise.reject('Failed to edit the reason of the mute.');

        this.reason = newReason;
        this.editTimestamp = editTimestamp;
        this.editModeratorId = editModeratorId;

        const logString = `${parseUser(this.editModeratorId)} edited the reason of ${parseUser(this.userId)}'s current mute (${this.id}).\n\n**Before**\n${oldReason}\n\n**After**\n${newReason}`;

        log(logString, 'Edit Mute Reason');
        return logString;
    }

    public static async create(userResolvable: UserResolvable, reason: string, duration: number, moderatorId: string | null = null, contextUrl: string | null = null) {
        if (isNaN(duration)) return Promise.reject('The specified duration is not a number or exceeds the range of UNIX time.');
        if (duration < 10) return Promise.reject("You can't mute someone for less than 10 seconds.");
        if (duration > 2419200) return Promise.reject("You can't mute someone for more than 28 days.");

        if (reason.length > 512) return Promise.reject('The mute reason must not be more than 512 characters long.');

        const guild = getGuild();

        const user = await client.users.fetch(userResolvable).catch(() => undefined);
        if (!user) return Promise.reject('Failed to resolve the user.');

        const member = await userToMember(user.id);

        const overwrittenMute = await Mute.getByUserID(user.id).catch(() => undefined);
        await overwrittenMute?.move(moderatorId);

        const timestamp = new Date();
        const expireTimestamp = new Date(timestamp.getTime() + duration * 1000);

        const data = {
            userId: user.id,
            moderatorId,
            reason,
            contextUrl,
            expireTimestamp,
            timestamp,
        } satisfies typeof schema.mute.$inferInsert;

        const result = await db.insert(schema.mute).values(data).returning({ id: schema.mute.id });

        if (result.length === 0) return Promise.reject('Failed to insert mute.');
        const { id } = result[0];

        const mute = new Mute({
            id,
            editModeratorId: null,
            editTimestamp: null,
            ...data,
        });

        let sentDM = true;
        await sendInfo(user, {
            description: mute.toString(false, false),
            title: `You have been muted on ${guild.name}.`,
        }).catch(() => {
            sentDM = false;
        });

        if (member) member.timeout(duration * 1000, reason);
        timeoutStore.set(mute, true);

        let logString = `${parseUser(user)} has been muted for ${secondsToString(duration)}.\n\n${mute.toString()}`;
        if (overwrittenMute) logString += `\n\nTheir previous mute has been overwritten:\n` + overwrittenMute.toString();
        if (!sentDM) logString += '\n\n-# They did not receive a direct message.';

        log(logString, 'Mute');
        return logString;
    }
}

export class LiftedMute extends LiftedPunishment {
    readonly TYPE_STRING: string = 'Lifted Mute';

    public static fromMute(mute: Mute, liftedModeratorId: string | null = null) {
        return new LiftedMute({
            id: mute.id,
            userId: mute.userId,
            moderatorId: mute.moderatorId,
            reason: mute.reason,
            contextUrl: mute.contextUrl,
            editTimestamp: mute.editTimestamp,
            editModeratorId: mute.editModeratorId,
            liftedTimestamp: new Date(),
            liftedModeratorId: liftedModeratorId,
            timestamp: mute.timestamp,
        });
    }

    static async getByUUID(uuid: string) {
        const result = await db.query.liftedMute.findFirst({
            where: sql.eq(schema.liftedMute.id, uuid),
        });
        if (!result) return Promise.reject('A lifted mute with the specified UUID does not exist.');
        return new LiftedMute(result);
    }

    static async getLatestByUserID(userId: string) {
        const result = await db.query.liftedMute.findFirst({
            where: sql.eq(schema.liftedMute.userId, userId),
            orderBy: sql.desc(schema.liftedMute.timestamp),
        });

        if (!result) return Promise.reject('The specified user does not have any lifted mutes.');
        return new LiftedMute(result);
    }

    static async getAllByUserID(userId: string) {
        const result = await db.query.liftedMute.findMany({
            where: sql.eq(schema.liftedMute.userId, userId),
            orderBy: sql.desc(schema.liftedMute.timestamp),
        });

        return result.map((entry) => new LiftedMute(entry));
    }

    public async editReason(newReason: string, editModeratorId: string) {
        if (newReason.length > 512) return Promise.reject('The mute reason must not be more than 512 characters long.');

        const oldReason = this.reason;
        const editTimestamp = new Date();

        const result = await db
            .update(schema.liftedMute)
            .set({
                reason: newReason,
                editModeratorId,
                editTimestamp,
            })
            .where(sql.eq(schema.liftedMute.id, this.id));

        if (result.rowCount === 0) return Promise.reject('Failed to edit the reason of the lifted mute.');

        this.reason = newReason;
        this.editTimestamp = editTimestamp;
        this.editModeratorId = editModeratorId;

        const logString = `${parseUser(this.editModeratorId)} edited the reason of ${parseUser(this.userId)}'s lifted mute (${this.id}).\n\n**Before**\n${oldReason}\n\n**After**\n${newReason}`;

        log(logString, 'Edit Lifted Mute Reason');
        return logString;
    }

    public async delete(moderatorId: string) {
        const result = await db.delete(schema.liftedMute).where(sql.eq(schema.liftedMute.id, this.id));
        if (result.rowCount === 0) return Promise.reject('Failed to delete lifted mute.');

        const logString = `${parseUser(moderatorId)} deleted the log entry of ${parseUser(this.userId)}'s lifted mute.\n\n${this.toString()}`;
        log(logString, 'Delete Lifted Mute Entry');
        return logString;
    }
}
