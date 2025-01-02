import type { UserResolvable } from 'discord.js';
import * as sql from 'drizzle-orm/sql';
import { db } from '../../../db/postgres.ts';
import * as schema from '../../../db/schema.ts';
import { client } from '../../bot.ts';
import { sendInfo } from '../embeds.ts';
import log from '../log.ts';
import { getGuild, parseUser, userToMember } from '../misc.ts';
import { Punishment } from './main.ts';

export class Kick extends Punishment {
    readonly TYPE_STRING: string = 'Kick';

    static async getByUUID(uuid: string) {
        const result = await db.query.kick.findFirst({ where: sql.eq(schema.kick.id, uuid) });
        if (!result) return Promise.reject('A kick with the specified UUID does not exist.');
        return new Kick(result);
    }

    static async getLatestByUserID(userId: string) {
        const result = await db.query.kick.findFirst({
            where: sql.eq(schema.kick.userId, userId),
            orderBy: sql.desc(schema.kick.timestamp),
        });

        if (!result) return Promise.reject('The specified user does not have any kicks.');
        return new Kick(result);
    }

    static async getAllByUserID(userId: string) {
        const result = await db.query.kick.findMany({
            where: sql.eq(schema.kick.userId, userId),
            orderBy: sql.desc(schema.kick.timestamp),
        });

        return result.map((entry) => new Kick(entry));
    }

    static async create(userResolvable: UserResolvable, reason: string, moderatorId: string | null = null, contextUrl: string | null = null, deleteMessageSeconds?: number) {
        if (reason.length > 512) return Promise.reject('The kick reason must not be more than 512 characters long.');

        const guild = getGuild();

        const user = await client.users.fetch(userResolvable).catch(() => undefined);
        if (!user) return Promise.reject('Failed to resolve the user.');

        const member = await userToMember(user.id, guild);

        const data = {
            userId: user.id,
            moderatorId,
            reason,
            contextUrl,
            timestamp: new Date(),
        } satisfies typeof schema.kick.$inferInsert;

        const result = await db.insert(schema.kick).values(data).returning({ id: schema.kick.id });

        if (result.length === 0) return Promise.reject('Failed to insert kick entry.');
        const { id } = result[0];

        const kick = new Kick({
            id,
            editModeratorId: null,
            editTimestamp: null,
            ...data,
        });

        let sentDM = true;
        await sendInfo(user, {
            description: kick.toString(false),
            title: `You have been kicked from ${guild.name}.`,
        }).catch(() => {
            sentDM = false;
        });

        if (deleteMessageSeconds) {
            if (await guild.bans.fetch(user).catch(() => undefined)) {
                await guild.members.unban(user, reason);
                await guild.members.ban(user, { reason, deleteMessageSeconds });
            } else {
                await guild.members.ban(user, { reason, deleteMessageSeconds });
                await guild.members.unban(user, reason);
            }
        } else {
            await member?.kick(reason);
        }

        let logString = `${parseUser(user)} has been kicked.\n\n${kick.toString()}`;
        if (!sentDM) logString += '\n\n*They did not receive a DM.*';

        log(logString, 'Kick');
        return logString;
    }

    public async editReason(newReason: string, editModeratorId: string) {
        if (newReason.length > 512) return Promise.reject('The kick reason must not be more than 512 characters long.');

        const previousReason = this.reason;
        const editTimestamp = new Date();

        const result = await db
            .update(schema.kick)
            .set({
                reason: newReason,
                editModeratorId,
                editTimestamp,
            })
            .where(sql.eq(schema.kick.id, this.id));

        if (result.rowCount === 0) return Promise.reject('Failed to edit the reason of the specified kick.');

        this.reason = newReason;
        this.editTimestamp = editTimestamp;
        this.editModeratorId = editModeratorId;

        const logString = `${parseUser(this.editModeratorId)} edited the reason of ${parseUser(this.userId)}'s kick (${this.id}).\n\n**Before**\n${previousReason}\n\n**After**\n${newReason}`;

        log(logString, 'Edit Kick Reason');
        return logString;
    }

    public async delete(moderatorID: string) {
        const result = await db.delete(schema.kick).where(sql.eq(schema.kick.id, this.id));
        if (result.rowCount === 0) return Promise.reject('Failed to delete kick.');

        const logString = `${parseUser(moderatorID)} deleted the log entry of ${parseUser(this.userId)}'s kick.\n\n${this.toString()}`;
        log(logString, 'Delete Kick');
        return logString;
    }
}
