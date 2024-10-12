import { EmbedBuilder } from 'discord.js';
import * as sql from 'drizzle-orm/sql';
import { db } from '../../db/postgres.ts';
import * as schema from '../../db/schema.ts';
import { EmbedColor, EmbedIcon } from './embeds.ts';
import log from './log.ts';
import { formatContextURL, parseUser } from './misc.ts';
import { formatTimeDate } from './time.ts';

export class Note {
    public readonly id: string;
    public readonly timestamp: Date;
    public readonly userId: string;
    public readonly moderatorId: string;

    public content: string;
    public contextUrl: string | null;
    public editTimestamp: Date | null;
    public editModeratorId: string | null;

    constructor(data: typeof schema.note.$inferSelect) {
        this.id = data.id;
        this.timestamp = data.timestamp;
        this.userId = data.userId;
        this.moderatorId = data.userId;
        this.content = data.content || '';
        this.contextUrl = data.contextUrl;
        this.editTimestamp = data.editTimestamp;
        this.editModeratorId = data.editModeratorId;
    }

    static async getByUUID(uuid: string) {
        const result = await db.query.note.findFirst({ where: sql.eq(schema.note.id, uuid) });
        if (!result) return Promise.reject('A note with the specified UUID does not exist.');
        return new Note(result);
    }

    static async getLatestByUserID(userId: string) {
        const result = await db.query.note.findFirst({ where: sql.eq(schema.note.userId, userId), orderBy: [sql.desc(schema.note.timestamp)] });
        if (!result) return Promise.reject('The specified user does not have any notes.');
        return new Note(result);
    }

    static async getAllByUserID(userId: string) {
        const result = await db.query.note.findMany({ where: sql.eq(schema.note.userId, userId), orderBy: [sql.desc(schema.note.timestamp)] });
        return result.map((entry) => new Note(entry));
    }

    static async create(userId: string, moderatorId: string, content: string, contextUrl: string | null = null) {
        if (content.length < 1 || content.length > 512) return Promise.reject('The content must be between 1 and 512 characters long.');

        const data = {
            userId,
            moderatorId,
            timestamp: new Date(),
            contextUrl,
            content,
        } satisfies typeof schema.note.$inferInsert;

        const result = await db.insert(schema.note).values(data).returning({ id: schema.note.id });

        if (result.length === 0) return Promise.reject('Failed to insert note.');
        const { id } = result[0];

        const note = new Note({
            id,
            editModeratorId: null,
            editTimestamp: null,
            ...data,
        });

        const logString = `${parseUser(userId)} has received a note.\n\n${note.toString()}`;

        log(logString, 'Add Note');
        return logString;
    }

    /**
     * Represents the note using a string.
     * @param includeUser Whether or not to include the user.
     * @returns The string.
     */
    public toString(includeUser: boolean = true) {
        let string = '';

        if (includeUser) {
            string += `**User:** ${parseUser(this.userId)}\n`;
        }

        string +=
            `**Content:** ${this.content}\n` +
            `**Moderator:** ${parseUser(this.moderatorId)}\n` +
            `**Context:** ${formatContextURL(this.contextUrl)}\n` +
            `**Created At:** ${formatTimeDate(this.timestamp)}\n` +
            `**ID:** ${this.id}`;

        if (this.editTimestamp && this.editModeratorId) {
            string += `\n*(last edited by ${parseUser(this.editModeratorId)} at ${formatTimeDate(this.editTimestamp)})*`;
        }

        return string;
    }

    /**
     * Represent the note using an embed.
     * @param title The title of the embed.
     * @param description The description of the embed.
     * @returns The embed.
     */
    public static toEmbed(title: string, description: string) {
        return new EmbedBuilder({
            author: {
                name: title,
                iconURL: EmbedIcon.Note,
            },
            color: EmbedColor.Yellow,
            description,
        });
    }

    /**
     * Delete the note.
     */
    public async delete(moderatorId: string) {
        const result = await db.delete(schema.note).where(sql.eq(schema.note.id, this.id));
        if (result.rowCount === 0) return Promise.reject('Failed to delete note.');

        const logString = `${parseUser(moderatorId)} deleted ${parseUser(this.userId)}'s note.\n\n${this.toString()}`;

        log(logString, 'Delete Note');
        return logString;
    }

    /**
     * Edit the content of the note.
     * @param newContent The new content.
     * @param moderatorId The moderator who is responsible for the edit.
     * @returns The old content.
     */
    public async editContent(newContent: string, moderatorId: string) {
        const timestamp = new Date();
        const oldContent = this.content;

        const result = await db
            .update(schema.note)
            .set({
                content: newContent,
                editTimestamp: timestamp,
                editModeratorId: moderatorId,
            })
            .where(sql.eq(schema.note.id, this.id));

        if (result.rowCount === 0) return Promise.reject('Failed to edit note content.');

        this.content = newContent;
        this.editTimestamp = timestamp;
        this.editModeratorId = moderatorId;

        const logString = `${parseUser(moderatorId)} edited the content of ${parseUser(this.userId)}'s note (${this.id}).\n\n**Before**\n${oldContent}\n\n**After**\n${newContent}`;

        log(logString, 'Edit Note');
        return logString;
    }
}
