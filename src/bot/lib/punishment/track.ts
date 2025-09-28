import type { UserResolvable } from 'discord.js';
import * as sql from 'drizzle-orm/sql';
import { db } from '../../../db/postgres.ts';
import * as schema from '../../../db/schema.ts';
import { client } from '../../bot.ts';
import log from '../log.ts';
import { parseUser } from '../misc.ts';
import { Punishment } from './main.ts';

export class Track extends Punishment {
    readonly TYPE_STRING: string = 'Track';

    static async getByUUID(uuid: string) {
        const result = await db.query.track.findFirst({ where: sql.eq(schema.track.id, uuid) });
        if (!result) return Promise.reject('A track entry with the specified UUID does not exist.');
        return new Track(result);
    }

    static async getByUserID(userId: string) {
        const result = await db.query.track.findFirst({ where: sql.eq(schema.track.userId, userId) });
        if (!result) return Promise.reject('The specified user does not have any track entries.');
        return new Track(result);
    }

    static async create(userResolvable: UserResolvable, reason: string, moderatorId: string | null = null, contextUrl: string | null = null) {
        if (reason.length > 512) return Promise.reject('The track entry reason must not be more than 512 characters long.');

        const user = await client.users.fetch(userResolvable).catch(() => undefined);
        if (!user) return Promise.reject('Failed to resolve the user.');

        const data = {
            userId: user.id,
            moderatorId,
            reason,
            contextUrl,
            timestamp: new Date(),
        } satisfies typeof schema.track.$inferInsert;

        const result = await db.insert(schema.track).values(data).returning({ id: schema.track.id });

        if (result.length === 0) return Promise.reject('Failed to insert track entry.');
        const { id } = result[0];

        const track = new Track({
            id,
            editModeratorId: null,
            editTimestamp: null,
            ...data,
        });

        let logString = `${parseUser(user)} will be tracked.\n\n${track.toString()}`;

        log(logString, 'Create Track');
        return logString;
    }

    public async editReason(newReason: string, editModeratorId: string) {
        if (newReason.length > 512) return Promise.reject('The track entry reason must not be more than 512 characters long.');

        const previousReason = this.reason;
        const editTimestamp = new Date();

        const result = await db
            .update(schema.track)
            .set({
                reason: newReason,
                editTimestamp,
                editModeratorId,
            })
            .where(sql.eq(schema.track.id, this.id));

        if (result.rowCount === 0) return Promise.reject('Failed to edit the reason of the specified track entry.');

        this.reason = newReason;
        this.editTimestamp = editTimestamp;
        this.editModeratorId = editModeratorId;

        const logString = `${parseUser(this.editModeratorId)} edited the reason of ${parseUser(this.userId)}'s track entry (${this.id}).\n\n**Before**\n${previousReason}\n\n**After**\n${newReason}`;

        log(logString, 'Edit Track Reason');
        return logString;
    }

    public async delete(moderatorId: string) {
        const result = await db.delete(schema.track).where(sql.eq(schema.track.id, this.id));
        if (result.rowCount === 0) return Promise.reject('Failed to delete track entry.');

        const logString = `${parseUser(moderatorId)} deleted ${parseUser(this.userId)}'s track entry.\n\n${this.toString()}`;
        log(logString, 'Delete Track');
        return logString;
    }
}
