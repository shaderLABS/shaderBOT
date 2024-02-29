import { EmbedBuilder } from 'discord.js';
import { db } from '../../db/postgres.ts';
import { EmbedColor, EmbedIcon } from './embeds.ts';
import log from './log.ts';
import { formatContextURL, parseUser } from './misc.ts';
import { formatTimeDate } from './time.ts';

export class Note {
    public readonly id: string;
    public readonly timestamp: Date;
    public readonly userID: string;
    public readonly moderatorID: string;

    public content: string;
    public contextURL?: string;
    public editTimestamp?: Date;
    public editModeratorID?: string;

    constructor(data: {
        id: string;
        timestamp: string | number | Date;
        user_id: string;
        mod_id: string;
        content?: string;
        context_url?: string;
        edited_timestamp?: string | number | Date;
        edited_mod_id?: string;
    }) {
        this.id = data.id;
        this.timestamp = new Date(data.timestamp);
        this.userID = data.user_id;
        this.moderatorID = data.mod_id;
        this.content = data.content || '';
        this.contextURL = data.context_url;
        this.editTimestamp = data.edited_timestamp ? new Date(data.edited_timestamp) : undefined;
        this.editModeratorID = data.edited_mod_id;
    }

    static async getByUUID(uuid: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM note WHERE id = $1;`, values: [uuid], name: 'note-uuid' });
        if (result.rowCount === 0) return Promise.reject('A note with the specified UUID does not exist.');
        return new Note(result.rows[0]);
    }

    static async getLatestByUserID(userID: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM note WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1;`, values: [userID], name: 'note-latest-user-id' });
        if (result.rowCount === 0) return Promise.reject('The specified user does not have any notes.');
        return new Note(result.rows[0]);
    }

    static async getAllByUserID(userID: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM note WHERE user_id = $1 ORDER BY timestamp DESC;`, values: [userID], name: 'note-all-user-id' });
        return result.rows.map((row) => new Note(row));
    }

    static async create(userID: string, moderatorID: string, content: string, contextURL?: string) {
        if (content.length < 1 || content.length > 512) return Promise.reject('The content must be between 1 and 512 characters long.');

        const timestamp = new Date();
        const result = await db.query({
            text: /*sql*/ `
                INSERT INTO note (user_id, mod_id, content, context_url, timestamp)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id;`,
            values: [userID, moderatorID, content, contextURL, timestamp],
            name: 'note-create',
        });

        if (result.rowCount === 0) return Promise.reject('Failed to insert note.');
        const { id } = result.rows[0];

        const note = new Note({
            id,
            mod_id: moderatorID,
            user_id: userID,
            timestamp,
            content: content,
            context_url: contextURL,
        });

        const logString = `${parseUser(userID)} has received a note.\n\n${note.toString()}`;

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
            string += `**User:** ${parseUser(this.userID)}\n`;
        }

        string +=
            `**Content:** ${this.content}\n` +
            `**Moderator:** ${parseUser(this.moderatorID)}\n` +
            `**Context:** ${formatContextURL(this.contextURL)}\n` +
            `**Created At:** ${formatTimeDate(this.timestamp)}\n` +
            `**ID:** ${this.id}`;

        if (this.editTimestamp && this.editModeratorID) {
            string += `\n*(last edited by ${parseUser(this.editModeratorID)} at ${formatTimeDate(this.editTimestamp)})*`;
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
    public async delete(moderatorID: string) {
        const result = await db.query({ text: /*sql*/ `DELETE FROM note WHERE id = $1;`, values: [this.id], name: 'note-delete' });
        if (result.rowCount === 0) return Promise.reject('Failed to delete note.');

        const logString = `${parseUser(moderatorID)} deleted ${parseUser(this.userID)}'s note.\n\n${this.toString()}`;

        log(logString, 'Delete Note');
        return logString;
    }

    /**
     * Edit the content of the note.
     * @param newContent The new content.
     * @param moderatorID The moderator who is responsible for the edit.
     * @returns The old content.
     */
    public async editContent(newContent: string, moderatorID: string) {
        const timestamp = new Date();
        const oldContent = this.content;

        const result = await db.query({
            text: /*sql*/ `
                UPDATE note
                SET content = $1, edited_timestamp = $2, edited_mod_id = $3
                WHERE id = $4;`,
            values: [newContent, timestamp, moderatorID, this.id],
            name: 'note-edit-content',
        });

        if (result.rowCount === 0) return Promise.reject('Failed to edit note content.');

        this.content = newContent;
        this.editTimestamp = timestamp;
        this.editModeratorID = moderatorID;

        const logString = `${parseUser(moderatorID)} edited the content of ${parseUser(this.userID)}'s note (${this.id}).\n\n**Before**\n${oldContent}\n\n**After**\n${newContent}`;

        log(logString, 'Edit Note');
        return logString;
    }
}
