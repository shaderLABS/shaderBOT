import crypto from 'crypto';
import { CategoryChannel, ChannelType, EmbedBuilder, Guild, GuildMember, GuildTextBasedChannel, OverwriteType, PermissionFlagsBits, PermissionOverwriteOptions, TextChannel, User } from 'discord.js';
import { db } from '../../db/postgres.js';
import { client, settings } from '../bot.js';
import { EmbedColor, EmbedIcon, sendInfo } from './embeds.js';
import log from './log.js';
import { getAlphabeticalChannelPosition, getGuild, parseUser, userToMember } from './misc.js';
import { formatTimeDate } from './time.js';

export class Project {
    public readonly id: string;
    public readonly channelID: string;

    public ownerIDs: string[];
    public roleID?: string;
    public archived: boolean;

    public static readonly CHANNEL_TYPES = [ChannelType.GuildText] as const;
    public static readonly CATEGORY_CHANNEL_TYPES = [ChannelType.GuildCategory] as const;

    static readonly OWNER_OVERWRITES: { APPLY: PermissionOverwriteOptions; LIFT: PermissionOverwriteOptions; BITFIELD: bigint } = {
        APPLY: {
            ManageWebhooks: true,
            ManageThreads: true,
        },
        LIFT: {
            ManageWebhooks: null,
            ManageThreads: null,
        },
        BITFIELD: PermissionFlagsBits.ManageWebhooks | PermissionFlagsBits.ManageThreads,
    } as const;

    constructor(data: { id: string; channel_id: string; owners: string[]; role_id?: string }) {
        this.id = data.id;
        this.channelID = data.channel_id;
        this.ownerIDs = data.owners;
        this.roleID = data.role_id;
        this.archived = !data.role_id;
    }

    public getChannel(): TextChannel {
        const channel = client.channels.cache.get(this.channelID);
        if (channel?.type !== ChannelType.GuildText) throw 'The project is linked to an invalid channel.';

        return channel;
    }

    public getNotificationRole(guild: Guild = getGuild()) {
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
            permissions: [],
            reason: `Create notification role for #${channel.name}.`,
        });
    }

    public static async bannerMessageToCDNURL(channelID: string, messageID: string) {
        const channel = client.channels.cache.get(channelID);
        if (!channel || !channel.isTextBased()) return Promise.reject('The specified channel does not exist.');

        const message = await channel.messages.fetch({ message: messageID, force: true }).catch(() => undefined);
        if (!message) return Promise.reject('The specified message does not exist.');

        const imageURL = message.embeds[0]?.image?.url;
        if (!imageURL) return Promise.reject('The specified message does not have embedded banner image.');

        return imageURL;
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

        channel.setPosition(getAlphabeticalChannelPosition(channel, channel.parent));

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

        const announcementChannel = client.channels.cache.get(settings.data.logging.announcementChannelID);
        if (announcementChannel?.isTextBased()) {
            sendInfo(announcementChannel, `${channel.toString()} (${channel.parent?.toString() || 'No Category'})`, 'A new project has been created!');
        }

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

    public async setBannerMessageID(messageID: string, ownerID: string) {
        const result = await db.query({ text: /*sql*/ `UPDATE project SET banner_message_id = $1 WHERE id = $2;`, values: [messageID, this.id], name: 'project-set-banner-message-id' });
        if (result.rowCount === 0) return Promise.reject('Failed to set the banner URL.');

        const logString = `${parseUser(ownerID)} set the banner image of their project <#${this.channelID}> (${this.id}).`;

        log(
            new EmbedBuilder({
                title: 'Set Project Banner',
                description: logString,
                image: { url: await Project.bannerMessageToCDNURL(this.channelID, messageID) },
            })
        );
        return logString;
    }

    public async removeBannerMessageID(ownerID: string) {
        const result = await db.query({
            text: /*sql*/ `UPDATE project SET banner_message_id = NULL WHERE id = $1 AND banner_message_id IS NOT NULL;`,
            values: [this.id],
            name: 'project-remove-banner-message-id',
        });
        if (result.rowCount === 0) return Promise.reject('There is no banner image set.');

        const logString = `${parseUser(ownerID)} removed the banner image from their project <#${this.channelID}> (${this.id}).`;

        log(logString, 'Remove Project Banner');
        return logString;
    }

    public async getBannerInformation() {
        const result = await db.query({
            text: /*sql*/ `
                SELECT banner_message_id, banner_last_timestamp
                FROM project
                WHERE id = $1 AND banner_message_id IS NOT NULL;`,
            values: [this.id],
            name: 'project-get-current-banner',
        });

        if (result.rowCount === 0) return Promise.reject('There is no banner image set.');

        const { banner_message_id, banner_last_timestamp }: { banner_message_id: string; banner_last_timestamp?: string } = result.rows[0];
        const bannerURL = await Project.bannerMessageToCDNURL(this.channelID, banner_message_id);

        if (banner_last_timestamp) {
            const lastTimestamp = new Date(banner_last_timestamp);

            const result = await db.query({
                text: /*sql*/ `
                    SELECT COUNT(*)
                    FROM project
                    WHERE banner_message_id IS NOT NULL AND role_id IS NOT NULL AND (banner_last_timestamp IS NULL OR banner_last_timestamp < $1::TIMESTAMP);`,
                values: [lastTimestamp],
                name: 'project-count-following-banners',
            });

            const count: number = result.rows[0].count;

            const nextTimestamp = new Date(Date.now() + count * 86_400_000);
            nextTimestamp.setHours(23, 59, 0, 0);

            return {
                lastTimestamp,
                nextTimestamp,
                bannerURL,
            };
        } else {
            const nextTimestamp = new Date();
            nextTimestamp.setHours(23, 59, 0, 0);

            return {
                lastTimestamp: null,
                nextTimestamp,
                bannerURL,
            };
        }
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
        const channel = this.getChannel();

        const projectMute = await ProjectMute.getByUserIDAndProjectID(member.id, this.id).catch(() => undefined);
        if (projectMute) await projectMute.lift(moderatorID);

        const newOwnerIDs = [...this.ownerIDs, member.id];

        const result = await db.query({ text: /*sql*/ `UPDATE project SET owners = $1 WHERE id = $2;`, values: [newOwnerIDs, this.id], name: 'project-update-owner' });
        if (result.rowCount === 0) return Promise.reject('Failed to add an owner to the project.');

        await this.applyPermissions(member, channel);

        this.ownerIDs = newOwnerIDs;

        const logString = `${parseUser(moderatorID)} added ${parseUser(member.user)} to the owners of the project linked to <#${this.channelID}> (${this.id}).`;

        log(logString, 'Add Project Owner');
        return logString;
    }

    public async removeOwner(user: User, moderatorID: string) {
        this.assertNotArchived();

        const channel = this.getChannel();

        const newOwnerIDs = this.ownerIDs.filter((id) => id !== user.id);
        if (this.ownerIDs.length === newOwnerIDs.length) return Promise.reject('The specified user is not an owner.');

        const result = await db.query({ text: /*sql*/ `UPDATE project SET owners = $1 WHERE id = $2;`, values: [newOwnerIDs, this.id], name: 'project-update-owner' });
        if (result.rowCount === 0) return Promise.reject('Failed to remove an owner from the project.');

        const currentOverwrite = channel.permissionOverwrites.cache.get(user.id);

        if (currentOverwrite) {
            if (currentOverwrite.allow.equals(Project.OWNER_OVERWRITES.BITFIELD) && currentOverwrite.deny.equals(0n)) await currentOverwrite.delete('Remove project owner.');
            else await currentOverwrite.edit(Project.OWNER_OVERWRITES.LIFT, 'Remove project owner.');
        }

        this.ownerIDs = newOwnerIDs;

        const logString = `${parseUser(moderatorID)} removed ${parseUser(user)} from the owners of the project linked to <#${this.channelID}> (${this.id}).`;

        log(logString, 'Remove Project Owner');
        return logString;
    }

    public async addSubscriber(member: GuildMember) {
        this.assertNotArchived();

        const role = await this.getNotificationRole();
        if (!role) return Promise.reject('Failed to resolve the notification role of the specified project.');

        if (member.roles.cache.has(role.id)) {
            return Promise.reject(`You already receive notifications from <#${this.channelID}> (${this.id}).\nYou can unsubscribe from notifications using \`/unsubscribe\`.`);
        }

        member.roles.add(role);

        const logString = `You will now receive notifications from <#${this.channelID}> (${this.id}).`;

        log(`${parseUser(member.user)} subscribed to the project linked to <#${this.channelID}> (${this.id}).`, 'Add Project Subscriber');
        return logString;
    }

    public async removeSubscriber(member: GuildMember) {
        this.assertNotArchived();

        const role = await this.getNotificationRole();
        if (!role) return Promise.reject('Failed to resolve the notification role of the specified project.');

        if (!member.roles.cache.has(role.id)) {
            return Promise.reject(`You do not receive notifications from <#${this.channelID}> (${this.id}).\nYou can subscribe to notifications using \`/subscribe\`.`);
        }

        member.roles.remove(role);

        const logString = `You will no longer receive notifications from <#${this.channelID}> (${this.id}).`;

        log(`${parseUser(member.user)} unsubscribed from the project linked to <#${this.channelID}> (${this.id}).`, 'Remove Project Subscriber');
        return logString;
    }

    public async applyPermissions(owner: GuildMember | User | string, channel: TextChannel = this.getChannel()) {
        await channel.permissionOverwrites.edit(owner, Project.OWNER_OVERWRITES.APPLY, { type: OverwriteType.Member, reason: 'Apply project owner permissions.' });
    }

    public static async isOwner(userID: string, channelID: string): Promise<Boolean> {
        return Boolean((await db.query({ text: /*sql*/ `SELECT 1 FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1`, values: [channelID, userID], name: 'project-is-owner' })).rows[0]);
    }

    public static async isProjectChannel(channelID: string): Promise<Boolean> {
        return Boolean((await db.query({ text: /*sql*/ `SELECT 1 FROM project WHERE channel_id = $1;`, values: [channelID], name: 'project-is-project' })).rows[0]);
    }

    public static async isProjectArchived(channelID: string): Promise<Boolean> {
        return !(await db.query({ text: /*sql*/ `SELECT role_id FROM project WHERE channel_id = $1;`, values: [channelID], name: 'project-is-archived' })).rows[0]?.role_id;
    }

    public static isChannelArchived(channel: GuildTextBasedChannel): Boolean {
        return channel.parentId !== null && settings.data.archive.categoryIDs.includes(channel.parentId);
    }

    public async archive() {
        this.assertNotArchived();

        const channel = this.getChannel();

        const result = await db.query({ text: /*sql*/ `UPDATE project SET role_id = NULL WHERE id = $1;`, values: [this.id], name: 'project-archive' });
        if (result.rowCount === 0) return Promise.reject(`Failed to archive project channel.`);

        const role = await this.getNotificationRole();
        if (role) await role.delete();

        channel.lockPermissions();

        const logString = `The project linked to <#${channel.id}> (${this.id}) has been archived.`;

        log(logString, 'Archive Project');
        return logString;
    }

    public async unarchive() {
        this.assertArchived();

        const channel = this.getChannel();
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

    public async move(categoryChannel: CategoryChannel, moderatorID: string) {
        const channel = this.getChannel();
        if (channel.parentId === categoryChannel.id) return Promise.reject('The specified project is already in this category.');

        const previousCategoryChannelID = channel.parentId;

        // must be updated sequentially because Discord API developers decided not to handle this properly.
        await channel.setParent(categoryChannel);
        await channel.setPosition(getAlphabeticalChannelPosition(channel, categoryChannel));

        const logString = `${parseUser(moderatorID)} moved <#${channel.id}> (${this.id}) out of <#${previousCategoryChannelID}> and into <#${categoryChannel.id}>.`;

        log(logString, 'Move Project');
        return logString;
    }

    public async delete(moderatorID: string) {
        const channel = this.getChannel();

        await this.deleteEntry();
        channel.lockPermissions();

        const logString = `${parseUser(moderatorID)} deleted the project linked to <#${channel.id}> (${this.id}).`;

        log(logString, 'Delete Project');
        return logString;
    }

    public async deleteEntry() {
        await ProjectMute.deleteAllByProjectID(this.id);

        const result = await db.query({ text: /*sql*/ `DELETE FROM project WHERE id = $1 RETURNING id;`, values: [this.id], name: 'project-delete' });
        if (result.rowCount === 0) return Promise.reject(`Failed to delete project channel.`);

        if (this.roleID) {
            const role = await this.getNotificationRole();
            if (role) role.delete();
        }
    }
}

export class ProjectMute {
    public readonly id: string;
    public readonly projectID: string;
    public readonly userID: string;
    public readonly timestamp: Date;

    static readonly MUTE_OVERWRITES: { APPLY: PermissionOverwriteOptions; LIFT: PermissionOverwriteOptions; BITFIELD: bigint } = {
        APPLY: {
            SendMessages: false,
            SendMessagesInThreads: false,
            AddReactions: false,
            CreatePublicThreads: false,
            CreatePrivateThreads: false,
        },
        LIFT: {
            SendMessages: null,
            SendMessagesInThreads: null,
            AddReactions: null,
            CreatePublicThreads: null,
            CreatePrivateThreads: null,
        },
        BITFIELD:
            PermissionFlagsBits.SendMessages |
            PermissionFlagsBits.SendMessagesInThreads |
            PermissionFlagsBits.AddReactions |
            PermissionFlagsBits.CreatePublicThreads |
            PermissionFlagsBits.CreatePrivateThreads,
    } as const;

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

        const member = await userToMember(user);
        if (member && member.permissions.has(PermissionFlagsBits.KickMembers)) return Promise.reject('You can not mute this member.');
        if (project.ownerIDs.includes(user.id)) return Promise.reject('You can not mute a channel owner.');

        const channel = project.getChannel();
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

        const projectMute = new ProjectMute({ id, project_id: project.id, user_id: user.id, timestamp });
        await projectMute.applyPermissions(channel);

        const logString = `${parseUser(ownerID)} muted ${parseUser(user)} in their project <#${channel.id}> (${project.id}).\n\n**Created At:** ${formatTimeDate(timestamp)}\n**ID:** ${id}`;

        log(logString, 'Project Create Mute');
        return logString;
    }

    public async applyPermissions(channel?: TextChannel) {
        if (!channel) {
            const project = await this.getProject();
            channel = project.getChannel();
        }

        await channel.permissionOverwrites.edit(this.userID, ProjectMute.MUTE_OVERWRITES.APPLY, { type: OverwriteType.Member, reason: 'Apply project mute permissions.' });
    }

    public async lift(ownerID: string) {
        const project = await this.getProject();
        const channel = project.getChannel();

        const result = await db.query({ text: /*sql*/ `DELETE FROM project_mute WHERE id = $1 RETURNING id;`, values: [this.id], name: 'project-mute-lift' });
        if (result.rowCount === 0) return Promise.reject(`Failed to delete project mute.`);

        const currentOverwrite = channel.permissionOverwrites.cache.get(this.userID);

        if (currentOverwrite) {
            if (currentOverwrite.allow.equals(0n) && currentOverwrite.deny.equals(ProjectMute.MUTE_OVERWRITES.BITFIELD)) await currentOverwrite.delete('Lift project mute.');
            else await currentOverwrite.edit(ProjectMute.MUTE_OVERWRITES.LIFT, 'Lift project mute.');
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
