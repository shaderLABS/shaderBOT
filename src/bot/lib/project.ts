import crypto from 'crypto';
import { ChannelType, EmbedBuilder, Guild, GuildMember, GuildTextBasedChannel, OverwriteType, PermissionFlagsBits, PermissionOverwriteOptions, TextChannel, User } from 'discord.js';
import { db } from '../../db/postgres.js';
import { settings } from '../bot.js';
import { EmbedColor, EmbedIcon } from './embeds.js';
import log from './log.js';
import { getGuild, parseUser, userToMember } from './misc.js';
import { formatTimeDate } from './time.js';

export class Project {
    public readonly id: string;
    public readonly channelID: string;

    public ownerIDs: string[];
    public roleID?: string;
    public archived: boolean;

    constructor(data: { id: string; channel_id: string; owners: string[]; role_id?: string }) {
        this.id = data.id;
        this.channelID = data.channel_id;
        this.ownerIDs = data.owners;
        this.roleID = data.role_id;
        this.archived = !data.role_id;
    }

    public getChannel(guild: Guild): TextChannel {
        const channel = guild.channels.cache.get(this.channelID);
        if (channel?.type !== ChannelType.GuildText) throw 'The project is linked to an invalid channel.';

        return channel;
    }

    public getNotificationRole(guild: Guild) {
        if (!this.roleID) throw 'The specified project is archived.';
        return guild.roles.fetch(this.roleID).catch(() => null);
    }

    public static async getByUUID(uuid: string) {
        const result = await db.query({ text: /*sql*/ `SELECT id, channel_id, owners::TEXT[], role_id FROM project WHERE id = $1;`, values: [uuid], name: 'project-uuid' });
        if (result.rowCount === 0) return Promise.reject('A project linked to the specified channel does not exist.');
        return new Project(result.rows[0]);
    }

    public static async getByChannelID(channelID: string) {
        const result = await db.query({ text: /*sql*/ `SELECT id, channel_id, owners::TEXT[], role_id FROM project WHERE channel_id = $1;`, values: [channelID], name: 'project-channel-id' });
        if (result.rowCount === 0) return Promise.reject('A project linked to the specified channel does not exist.');
        return new Project(result.rows[0]);
    }

    public static async getAllUnarchivedByOwnerID(userID: string) {
        const result = await db.query({
            text: /*sql*/ `SELECT id, channel_id, owners::TEXT[], role_id FROM project WHERE $1 = ANY (owners) AND role_id IS NOT NULL;`,
            values: [userID],
            name: 'project-all-unarchived-owner-id',
        });

        return result.rows.map((row) => new Project(row));
    }

    private static createNotificationRole(channel: TextChannel) {
        return channel.guild.roles.create({
            name: channel.name,
            mentionable: false,
            reason: `Create notification role for #${channel.name}.`,
        });
    }

    public static async create(channel: TextChannel, moderatorID: string) {
        if (Project.isChannelArchived(channel)) return Promise.reject('The specified channel is archived.');
        if (await Project.isProjectChannel(channel.id)) return Promise.reject('The specified channel is already linked to a project.');

        const role = await Project.createNotificationRole(channel);

        const result = await db.query({
            text: /*sql*/ `
                INSERT INTO project (channel_id, owners, role_id)
                VALUES ($1, $2, $3)
                RETURNING id;`,
            values: [channel.id, [], role.id],
            name: 'project-create',
        });

        if (result.rowCount === 0) return Promise.reject('Failed to create project channel.');
        const { id } = result.rows[0];

        const initializationEmbed = new EmbedBuilder({
            author: {
                name: 'Create Project',
                iconURL: EmbedIcon.Success,
            },
            color: EmbedColor.Green,
            title: '#' + channel.name,
            fields: [
                {
                    name: 'Notification Role',
                    value: role.toString(),
                },
                {
                    name: 'Information',
                    value: 'Please take a look at the [documentation](https://github.com/shaderLABS/shaderBOT/wiki/Projects) for more information about Projects and how to manage them.',
                },
            ],
            footer: {
                text: 'ID: ' + id,
            },
        });

        log(`${parseUser(moderatorID)} created a project linked to <#${channel.id}> (${id}).`, 'Create Project');
        return initializationEmbed;
    }

    public async generateWebhookSecret(ownerID: string) {
        this.assertNotArchived();

        const secret = crypto.randomBytes(32);
        const endpoint = `https://${process.env.DOMAIN || 'localhost'}/api/webhook/release/${this.channelID}`;

        const result = await db.query({ text: /*sql*/ `UPDATE project SET webhook_secret = $1 WHERE id = $2;`, values: [secret, this.id], name: 'project-generate-webhook-secret' });
        if (result.rowCount === 0) return Promise.reject('Failed to generate project webhook secret.');

        log(`${parseUser(ownerID)} generated a webhook secret key for their project <#${this.channelID}> (${this.id}).`, 'Project Webhook');

        return { secret, endpoint };
    }

    public async setBannerURL(bannerURL: string, ownerID: string) {
        const result = await db.query({ text: /*sql*/ `UPDATE project SET banner_url = $1 WHERE id = $2;`, values: [bannerURL, this.id], name: 'project-set-banner-url' });
        if (result.rowCount === 0) return Promise.reject('Failed to set the banner URL.');

        const logString = `${parseUser(ownerID)} set the banner image of their project <#${this.channelID}> (${this.id}).`;

        log(
            new EmbedBuilder({
                title: 'Set Project Banner',
                description: logString,
                image: { url: bannerURL },
            })
        );
        return logString;
    }

    public async removeBannerURL(ownerID: string) {
        const result = await db.query({ text: /*sql*/ `UPDATE project SET banner_url = NULL WHERE id = $1 AND banner_url IS NOT NULL;`, values: [this.id], name: 'project-remove-banner-url' });
        if (result.rowCount === 0) return Promise.reject('There is no banner image set.');

        const logString = `${parseUser(ownerID)} removed the banner image from their project <#${this.channelID}> (${this.id}).`;

        log(logString, 'Remove Project Banner');
        return logString;
    }

    public assertOwner(userID: string) {
        if (!this.ownerIDs.includes(userID)) throw 'You are not an owner of this project.';
        return this;
    }

    public assertNotArchived() {
        if (this.archived) throw 'The specified project is archived.';
        return this;
    }

    public assertArchived() {
        if (!this.archived) throw 'The specified project is not archived.';
        return this;
    }

    public async addOwner(member: GuildMember, moderatorID: string) {
        this.assertNotArchived();

        if (this.ownerIDs.includes(member.id)) return Promise.reject('The specified member is already an owner.');
        const channel = this.getChannel(member.guild);

        const projectMute = await ProjectMute.getByUserIDAndProjectID(member.id, this.id).catch(() => undefined);
        if (projectMute) await projectMute.lift(moderatorID);

        const newOwnerIDs = [...this.ownerIDs, member.id];

        const result = await db.query({ text: /*sql*/ `UPDATE project SET owners = $1 WHERE id = $2;`, values: [newOwnerIDs, this.id], name: 'project-update-owner' });
        if (result.rowCount === 0) return Promise.reject('Failed to add an owner to the project.');

        channel.permissionOverwrites.create(member, Project.OWNER_OVERWRITES, { type: OverwriteType.Member, reason: 'Add project owner.' });
        this.ownerIDs = newOwnerIDs;

        const logString = `${parseUser(moderatorID)} added ${parseUser(member.user)} to the owners of the project linked to <#${this.channelID}> (${this.id}).`;

        log(logString, 'Add Project Owner');
        return logString;
    }

    public async removeOwner(user: User, moderatorID: string) {
        this.assertNotArchived();

        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        const channel = this.getChannel(guild);
        const member = await userToMember(guild, user.id);

        const newOwnerIDs = this.ownerIDs.filter((id) => id !== user.id);
        if (this.ownerIDs.length === newOwnerIDs.length) return Promise.reject('The specified user is not an owner.');

        const result = await db.query({ text: /*sql*/ `UPDATE project SET owners = $1 WHERE id = $2;`, values: [newOwnerIDs, this.id], name: 'project-update-owner' });
        if (result.rowCount === 0) return Promise.reject('Failed to remove an owner from the project.');

        if (member) channel.permissionOverwrites.delete(member, 'Remove project owner.');
        this.ownerIDs = newOwnerIDs;

        const logString = `${parseUser(moderatorID)} removed ${parseUser(user)} from the owners of the project linked to <#${this.channelID}> (${this.id}).`;

        log(logString, 'Remove Project Owner');
        return logString;
    }

    // TODO: log
    public async addSubscriber(member: GuildMember) {
        this.assertNotArchived();

        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        const role = await this.getNotificationRole(guild);
        if (!role) return Promise.reject('Failed to resolve the notification role of the specified project.');

        if (member.roles.cache.has(role.id)) {
            return Promise.reject(`You already receive notifications from <#${this.channelID}> (${this.id}).\nYou can unsubscribe from notifications using \`/unsubscribe\`.`);
        }

        member.roles.add(role);

        const logString = `You will now receive notifications from <#${this.channelID}> (${this.id}).`;
        return logString;
    }

    // TODO: log
    public async removeSubscriber(member: GuildMember) {
        this.assertNotArchived();

        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        const role = await this.getNotificationRole(guild);
        if (!role) return Promise.reject('Failed to resolve the notification role of the specified project.');

        if (!member.roles.cache.has(role.id)) {
            return Promise.reject(`You do not receive notifications from <#${this.channelID}> (${this.id}).\nYou can subscribe to notifications using \`/subscribe\`.`);
        }

        member.roles.remove(role);

        const logString = `You will no longer receive notifications from <#${this.channelID}> (${this.id}).`;
        return logString;
    }

    public static readonly OWNER_OVERWRITES: PermissionOverwriteOptions = {
        ManageWebhooks: true,
        ManageThreads: true,
    };

    public async applyPermissions(owner: GuildMember | User | string, channel?: TextChannel) {
        if (!channel) {
            const guild = getGuild();
            if (!guild) return Promise.reject('No guild found.');

            channel = this.getChannel(guild);
        }

        await channel.permissionOverwrites.create(owner, Project.OWNER_OVERWRITES, { type: OverwriteType.Member, reason: 'Apply project owner permissions.' });
    }

    public static async isOwner(userID: string, channelID: string): Promise<Boolean> {
        return !!(await db.query({ text: /*sql*/ `SELECT 1 FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1`, values: [channelID, userID], name: 'project-is-owner' })).rows[0];
    }

    public static async isProjectChannel(channelID: string): Promise<Boolean> {
        return !!(await db.query({ text: /*sql*/ `SELECT 1 FROM project WHERE channel_id = $1;`, values: [channelID], name: 'project-is-project' })).rows[0];
    }

    public static async isProjectArchived(channelID: string): Promise<Boolean> {
        return !(await db.query({ text: /*sql*/ `SELECT role_id FROM project WHERE channel_id = $1;`, values: [channelID], name: 'project-is-archived' })).rows[0]?.role_id;
    }

    public static isChannelArchived(channel: GuildTextBasedChannel): Boolean {
        return channel.parentId !== null && settings.data.archive.categoryIDs.includes(channel.parentId);
    }

    public async archive() {
        this.assertNotArchived();

        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        const channel = this.getChannel(guild);

        const result = await db.query({ text: /*sql*/ `UPDATE project SET role_id = NULL WHERE id = $1;`, values: [this.id], name: 'project-archive' });
        if (result.rowCount === 0) return Promise.reject(`Failed to archive project channel.`);

        const role = await this.getNotificationRole(guild);
        if (role) await role.delete();

        channel.lockPermissions();

        const logString = `The project linked to <#${channel.id}> (${this.id}) has been archived.`;

        log(logString, 'Archive Project');
        return logString;
    }

    public async unarchive() {
        this.assertArchived();

        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        const channel = this.getChannel(guild);
        const role = await Project.createNotificationRole(channel);

        const result = await db.query({ text: /*sql*/ `UPDATE project SET role_id = $1 WHERE id = $2;`, values: [role.id, this.id], name: 'project-unarchive' });
        if (result.rowCount === 0) return Promise.reject(`Failed to unarchive project channel.`);

        for (const ownerID of this.ownerIDs) {
            this.applyPermissions(ownerID, channel).catch(() => undefined);
        }

        for (const projectMute of await ProjectMute.getAllByProjectID(this.id)) {
            projectMute.applyPermissions().catch(() => undefined);
        }

        const logString = `The project linked to <#${this.channelID}> (${this.id}) has been unarchived.`;

        log(logString, 'Unarchive Project');
        return logString;
    }

    public async delete(moderatorID: string) {
        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        const channel = this.getChannel(guild);

        this.deleteEntry(guild);
        channel.lockPermissions();

        const logString = `${parseUser(moderatorID)} deleted the project linked to <#${channel.id}> (${this.id}).`;

        log(logString, 'Delete Project');
        return logString;
    }

    public async deleteEntry(guild?: Guild) {
        guild ??= getGuild();
        if (!guild) return Promise.reject('No guild found.');

        await ProjectMute.deleteAllByProjectID(this.id);

        const result = await db.query({ text: /*sql*/ `DELETE FROM project WHERE id = $1 RETURNING id;`, values: [this.id], name: 'project-delete' });
        if (result.rowCount === 0) return Promise.reject(`Failed to delete project channel.`);

        if (this.roleID) {
            const role = await this.getNotificationRole(guild);
            if (role) role.delete();
        }
    }
}

export class ProjectMute {
    public readonly id: string;
    public readonly projectID: string;
    public readonly userID: string;
    public readonly timestamp: Date;

    constructor(data: { id: string; project_id: string; user_id: string; timestamp: string | number | Date }) {
        this.id = data.id;
        this.projectID = data.project_id;
        this.userID = data.user_id;
        this.timestamp = new Date(data.timestamp);
    }

    public getProject() {
        return Project.getByUUID(this.projectID);
    }

    public static async getAllByUserID(userID: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM project_mute WHERE user_id = $1 ORDER BY timestamp DESC;`, values: [userID], name: 'project-mute-all-user-id' });
        return result.rows.map((row) => new ProjectMute(row));
    }

    public static async getAllByProjectID(projectID: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM project_mute WHERE project_id = $1 ORDER BY timestamp DESC;`, values: [projectID], name: 'project-mute-all-project-id' });
        return result.rows.map((row) => new ProjectMute(row));
    }

    public static async getByUserIDAndProjectID(userID: string, projectID: string) {
        const result = await db.query({
            text: /*sql*/ `SELECT * FROM project_mute WHERE user_id = $1 AND project_id = $2 LIMIT 1;`,
            values: [userID, projectID],
            name: 'project-mute-user-id-project-id',
        });

        if (result.rowCount === 0) return Promise.reject('The user is not muted in the specified project.');
        return new ProjectMute(result.rows[0]);
    }

    public static async create(project: Project, user: User, ownerID: string) {
        project.assertNotArchived();

        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        const member = await userToMember(guild, user);
        if (member && member.permissions.has(PermissionFlagsBits.KickMembers)) return Promise.reject('You can not mute this member.');
        if (project.ownerIDs.includes(user.id)) return Promise.reject('You can not mute a channel owner.');

        const channel = project.getChannel(guild);
        const timestamp = new Date();

        const result = await db.query({
            text: /*sql*/ `
                INSERT INTO project_mute (project_id, user_id, timestamp)
                VALUES ($1, $2, $3)
                RETURNING id;`,
            values: [project.id, user.id, timestamp],
            name: 'project-mute-create',
        });

        if (result.rowCount === 0) return Promise.reject('Failed to create project mute.');
        const { id } = result.rows[0];

        if (member) channel.permissionOverwrites.edit(member, { SendMessages: false, AddReactions: false }, { type: OverwriteType.Member, reason: 'Create project mute.' });

        const logString = `${parseUser(ownerID)} muted ${parseUser(user)} in their project <#${channel.id}> (${project.id}).\n\n**Created At:** ${formatTimeDate(timestamp)}\n**ID:** ${id}`;

        log(logString, 'Project Create Mute');
        return logString;
    }

    public async applyPermissions() {
        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        const project = await this.getProject();
        const channel = project.getChannel(guild);

        await channel.permissionOverwrites.edit(this.userID, { SendMessages: false, AddReactions: false }, { type: OverwriteType.Member, reason: 'Apply project mute permissions.' });
    }

    public async lift(ownerID: string) {
        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        const project = await this.getProject();
        const channel = project.getChannel(guild);

        const result = await db.query({ text: /*sql*/ `DELETE FROM project_mute WHERE id = $1 RETURNING id;`, values: [this.id], name: 'project-mute-lift' });
        if (result.rowCount === 0) return Promise.reject(`Failed to delete project mute.`);

        const currentOverwrite = channel.permissionOverwrites.cache.get(this.userID);

        if (currentOverwrite) {
            if (currentOverwrite.allow.equals(0n) && currentOverwrite.deny.equals([PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions])) currentOverwrite.delete('Lift project mute.');
            else currentOverwrite.edit({ SendMessages: null, AddReactions: null }, 'Lift project mute.');
        }

        const logString = `${parseUser(ownerID)} unmuted ${parseUser(this.userID)} in their project <#${channel.id}> (${project.id}).\n\n**ID:** ${this.id}\n**Created At:** ${formatTimeDate(
            this.timestamp
        )}`;

        log(logString, 'Project Lift Mute');
        return logString;
    }

    public static async deleteAllByProjectID(projectID: string) {
        const result = await db.query({ text: /*sql*/ `DELETE FROM project_mute WHERE project_id = $1 RETURNING id;`, values: [projectID], name: 'project-mute-delete-all-by-project-id' });
        return result.rowCount;
    }

    public toString() {
        return `**User:** ${parseUser(this.userID)}\n**Created At:** ${formatTimeDate(this.timestamp)}\n**ID:** ${this.id}`;
    }
}
