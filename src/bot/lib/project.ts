import type { GuildTextBasedChannel, PermissionOverwriteOptions } from 'discord.js';
import { CategoryChannel, ChannelType, EmbedBuilder, Guild, GuildMember, OverwriteType, PermissionFlagsBits, TextChannel, User } from 'discord.js';
import * as sql from 'drizzle-orm/sql';
import crypto from 'node:crypto';
import { db } from '../../db/postgres.ts';
import * as schema from '../../db/schema.ts';
import { client, settings } from '../bot.ts';
import { EmbedColor, EmbedIcon, sendInfo } from './embeds.ts';
import log from './log.ts';
import { getAlphabeticalChannelPosition, getGuild, parseUser, userToMember } from './misc.ts';
import { formatTimeDate } from './time.ts';

export class Project {
    public readonly id: string;
    public readonly channelId: string;

    public ownerIds: string[];
    public roleId: string | null;
    public archived: boolean;

    public static readonly CHANNEL_TYPES = [ChannelType.GuildText] as const;
    public static readonly CATEGORY_CHANNEL_TYPES = [ChannelType.GuildCategory] as const;

    static readonly OWNER_OVERWRITES = {
        APPLY: {
            ManageWebhooks: true,
            ManageThreads: true,
        } satisfies PermissionOverwriteOptions,
        LIFT: {
            ManageWebhooks: null,
            ManageThreads: null,
        } satisfies PermissionOverwriteOptions,
        BITFIELD: PermissionFlagsBits.ManageWebhooks | PermissionFlagsBits.ManageThreads,
    } as const;

    constructor(data: typeof schema.project.$inferSelect) {
        this.id = data.id;
        this.channelId = data.channelId;
        this.ownerIds = data.ownerIds;
        this.roleId = data.roleId;
        this.archived = !data.roleId;
    }

    public getChannel(): TextChannel {
        const channel = client.channels.cache.get(this.channelId);
        if (channel?.type !== ChannelType.GuildText) throw 'The project is linked to an invalid channel.';

        return channel;
    }

    public getNotificationRole(guild: Guild = getGuild()) {
        if (!this.roleId) throw 'The specified project is archived.';
        return guild.roles.fetch(this.roleId).catch(() => null);
    }

    public static async getByUUID(uuid: string) {
        const result = await db.query.project.findFirst({ where: sql.eq(schema.project.id, uuid) });
        if (!result) return Promise.reject('A project linked to the specified channel does not exist.');
        return new Project(result);
    }

    public static async getByChannelID(channelId: string) {
        const result = await db.query.project.findFirst({
            where: sql.eq(schema.project.channelId, channelId),
        });
        if (!result) return Promise.reject('A project linked to the specified channel does not exist.');
        return new Project(result);
    }

    public static async getAllUnarchivedByOwnerID(userId: string) {
        const result = await db.query.project.findMany({
            where: sql.and(sql.isNotNull(schema.project.roleId), sql.arrayContains(schema.project.ownerIds, [userId])),
        });

        return result.map((entry) => new Project(entry));
    }

    private static createNotificationRole(channel: TextChannel) {
        return channel.guild.roles.create({
            name: channel.name,
            mentionable: false,
            permissions: [],
            reason: `Create notification role for #${channel.name}.`,
        });
    }

    public static async bannerMessageToCDNURL(channelId: string, messageId: string) {
        const channel = client.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) return Promise.reject('The specified channel does not exist.');

        const message = await channel.messages.fetch({ message: messageId, force: true }).catch(() => undefined);
        if (!message) return Promise.reject('The specified message does not exist.');

        const imageURL = message.embeds[0]?.image?.url;
        if (!imageURL) return Promise.reject('The specified message does not have embedded banner image.');

        return imageURL;
    }

    public static async create(channel: TextChannel, moderatorId: string) {
        if (Project.isChannelArchived(channel)) return Promise.reject('The specified channel is archived.');
        if (await Project.isProjectChannel(channel.id)) return Promise.reject('The specified channel is already linked to a project.');

        const role = await Project.createNotificationRole(channel);

        const data = {
            channelId: channel.id,
            ownerIds: [],
            roleId: role.id,
        } satisfies typeof schema.project.$inferInsert;

        const result = await db.insert(schema.project).values(data).returning({ id: schema.project.id });

        if (result.length === 0) return Promise.reject('Failed to create project channel.');
        const { id } = result[0];

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
                    value: `Please take a look at the [documentation](https://github.com/shaderLABS/shaderBOT/wiki/Projects) for more information about Projects and how to manage them.\n-# ${id}`,
                },
            ],
        });

        const announcementChannel = client.channels.cache.get(settings.data.logging.announcementChannelID);
        if (announcementChannel?.isSendable()) {
            sendInfo(announcementChannel, {
                description: `${channel.toString()} (${channel.parent?.toString() || 'No Category'})`,
                title: 'A new project has been created!',
            });
        }

        log(`${parseUser(moderatorId)} created a project linked to <#${channel.id}> (${id}).`, 'Create Project');
        return initializationEmbed;
    }

    public async generateWebhookSecret(ownerId: string) {
        this.assertNotArchived();

        const secret = crypto.randomBytes(32);
        const endpoint = `https://${process.env.DOMAIN || 'localhost'}/api/webhook/release/${this.channelId}`;

        const result = await db.update(schema.project).set({ webhookSecret: secret }).where(sql.eq(schema.project.id, this.id));
        if (result.rowCount === 0) return Promise.reject('Failed to generate project webhook secret.');

        log(`${parseUser(ownerId)} generated a webhook secret key for their project <#${this.channelId}> (${this.id}).`, 'Project Webhook');

        return { secret, endpoint };
    }

    public async setBannerMessageID(messageId: string, ownerId: string) {
        const result = await db.update(schema.project).set({ bannerMessageId: messageId }).where(sql.eq(schema.project.id, this.id));
        if (result.rowCount === 0) return Promise.reject('Failed to set the banner URL.');

        const logString = `${parseUser(ownerId)} set the banner image of their project <#${this.channelId}> (${this.id}).`;

        log(
            new EmbedBuilder({
                title: 'Set Project Banner',
                description: logString,
                image: { url: await Project.bannerMessageToCDNURL(this.channelId, messageId) },
            }),
        );
        return logString;
    }

    public async removeBannerMessageID(ownerId: string) {
        const result = await db
            .update(schema.project)
            .set({ bannerMessageId: null })
            .where(sql.and(sql.eq(schema.project.id, this.id), sql.isNotNull(schema.project.bannerMessageId)));

        if (result.rowCount === 0) return Promise.reject('There is no banner image set.');

        const logString = `${parseUser(ownerId)} removed the banner image from their project <#${this.channelId}> (${this.id}).`;

        log(logString, 'Remove Project Banner');
        return logString;
    }

    public async getBannerInformation() {
        const result = await db.query.project.findFirst({
            columns: {
                bannerMessageId: true,
                bannerLastTimestamp: true,
            },
            where: sql.eq(schema.project.id, this.id),
        });

        if (!result || !result.bannerMessageId) return Promise.reject('There is no banner image set.');
        const { bannerMessageId, bannerLastTimestamp } = result;

        const bannerURL = await Project.bannerMessageToCDNURL(this.channelId, bannerMessageId);

        if (bannerLastTimestamp) {
            const lastTimestamp = new Date(bannerLastTimestamp);

            const result = await db
                .select({ count: sql.count() })
                .from(schema.project)
                .where(
                    sql.and(
                        sql.isNotNull(schema.project.bannerMessageId),
                        sql.isNotNull(schema.project.roleId),
                        sql.or(sql.isNull(schema.project.bannerLastTimestamp), sql.lt(schema.project.bannerLastTimestamp, lastTimestamp)),
                    ),
                );

            const nextTimestamp = new Date(Date.now() + result[0].count * 86_400_000);
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
        if (!this.ownerIds.includes(userID)) throw 'You are not an owner of this project.';
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

    public async addOwner(member: GuildMember, moderatorId: string) {
        this.assertNotArchived();

        if (this.ownerIds.includes(member.id)) return Promise.reject('The specified member is already an owner.');
        const channel = this.getChannel();

        const projectMute = await ProjectMute.getByUserIDAndProjectID(member.id, this.id).catch(() => undefined);
        if (projectMute) await projectMute.lift(moderatorId);

        const newOwnerIds = [...this.ownerIds, member.id];

        const result = await db.update(schema.project).set({ ownerIds: newOwnerIds }).where(sql.eq(schema.project.id, this.id));
        if (result.rowCount === 0) return Promise.reject('Failed to add an owner to the project.');

        await this.applyPermissions(member, channel);

        this.ownerIds = newOwnerIds;

        const logString = `${parseUser(moderatorId)} added ${parseUser(member.user)} to the owners of the project linked to <#${this.channelId}> (${this.id}).`;

        log(logString, 'Add Project Owner');
        return logString;
    }

    public async removeOwner(user: User, moderatorId: string) {
        this.assertNotArchived();

        const channel = this.getChannel();

        const newOwnerIds = this.ownerIds.filter((id) => id !== user.id);
        if (this.ownerIds.length === newOwnerIds.length) return Promise.reject('The specified user is not an owner.');

        const result = await db.update(schema.project).set({ ownerIds: newOwnerIds }).where(sql.eq(schema.project.id, this.id));
        if (result.rowCount === 0) return Promise.reject('Failed to remove an owner from the project.');

        const currentOverwrite = channel.permissionOverwrites.cache.get(user.id);

        if (currentOverwrite) {
            if (currentOverwrite.allow.equals(Project.OWNER_OVERWRITES.BITFIELD) && currentOverwrite.deny.equals(0n)) await currentOverwrite.delete('Remove project owner.');
            else await currentOverwrite.edit(Project.OWNER_OVERWRITES.LIFT, 'Remove project owner.');
        }

        this.ownerIds = newOwnerIds;

        const logString = `${parseUser(moderatorId)} removed ${parseUser(user)} from the owners of the project linked to <#${this.channelId}> (${this.id}).`;

        log(logString, 'Remove Project Owner');
        return logString;
    }

    public async addSubscriber(member: GuildMember) {
        this.assertNotArchived();

        const role = await this.getNotificationRole();
        if (!role) return Promise.reject('Failed to resolve the notification role of the specified project.');

        if (member.roles.cache.has(role.id)) {
            return Promise.reject(`You already receive notifications from <#${this.channelId}> (${this.id}).\nYou can unsubscribe from notifications using \`/unsubscribe\`.`);
        }

        member.roles.add(role);

        const logString = `You will now receive notifications from <#${this.channelId}> (${this.id}).`;

        log(`${parseUser(member.user)} subscribed to the project linked to <#${this.channelId}> (${this.id}).`, 'Add Project Subscriber');
        return logString;
    }

    public async removeSubscriber(member: GuildMember) {
        this.assertNotArchived();

        const role = await this.getNotificationRole();
        if (!role) return Promise.reject('Failed to resolve the notification role of the specified project.');

        if (!member.roles.cache.has(role.id)) {
            return Promise.reject(`You do not receive notifications from <#${this.channelId}> (${this.id}).\nYou can subscribe to notifications using \`/subscribe\`.`);
        }

        member.roles.remove(role);

        const logString = `You will no longer receive notifications from <#${this.channelId}> (${this.id}).`;

        log(`${parseUser(member.user)} unsubscribed from the project linked to <#${this.channelId}> (${this.id}).`, 'Remove Project Subscriber');
        return logString;
    }

    public async applyPermissions(owner: GuildMember | User | string, channel: TextChannel = this.getChannel()) {
        await channel.permissionOverwrites.edit(owner, Project.OWNER_OVERWRITES.APPLY, {
            type: OverwriteType.Member,
            reason: 'Apply project owner permissions.',
        });
    }

    public static async isOwner(userId: string, channelId: string): Promise<boolean> {
        const result = await db.query.project.findFirst({
            columns: { ownerIds: true },
            where: sql.eq(schema.project.channelId, channelId),
        });

        return result !== undefined && result.ownerIds.includes(userId);
    }

    public static async isProjectChannel(channelId: string): Promise<boolean> {
        const result = await db.query.project.findFirst({
            columns: { id: true },
            where: sql.eq(schema.project.channelId, channelId),
        });

        return result !== undefined;
    }

    public static async isProjectArchived(channelId: string): Promise<boolean> {
        const result = await db.query.project.findFirst({
            columns: { roleId: true },
            where: sql.eq(schema.project.channelId, channelId),
        });

        return result !== undefined && result.roleId === null;
    }

    public static isChannelArchived(channel: GuildTextBasedChannel): Boolean {
        return channel.parentId !== null && settings.data.archive.categoryIDs.includes(channel.parentId);
    }

    public async archive() {
        this.assertNotArchived();

        const channel = this.getChannel();

        const result = await db.update(schema.project).set({ roleId: null }).where(sql.eq(schema.project.id, this.id));
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

        const result = await db.update(schema.project).set({ roleId: role.id }).where(sql.eq(schema.project.id, this.id));
        if (result.rowCount === 0) return Promise.reject(`Failed to unarchive project channel.`);

        for (const ownerID of this.ownerIds) {
            this.applyPermissions(ownerID, channel).catch(() => undefined);
        }

        for (const projectMute of await ProjectMute.getAllByProjectID(this.id)) {
            projectMute.applyPermissions().catch(() => undefined);
        }

        const logString = `The project linked to <#${this.channelId}> (${this.id}) has been unarchived.`;

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

        const result = await db.delete(schema.project).where(sql.eq(schema.project.id, this.id));
        if (result.rowCount === 0) return Promise.reject(`Failed to delete project channel.`);

        if (this.roleId) {
            const role = await this.getNotificationRole();
            if (role) role.delete();
        }
    }
}

export class ProjectMute {
    public readonly id: string;
    public readonly projectId: string;
    public readonly userId: string;
    public readonly timestamp: Date;

    static readonly MUTE_OVERWRITES = {
        APPLY: {
            SendMessages: false,
            SendMessagesInThreads: false,
            AddReactions: false,
            CreatePublicThreads: false,
            CreatePrivateThreads: false,
        } satisfies PermissionOverwriteOptions,
        LIFT: {
            SendMessages: null,
            SendMessagesInThreads: null,
            AddReactions: null,
            CreatePublicThreads: null,
            CreatePrivateThreads: null,
        } satisfies PermissionOverwriteOptions,
        BITFIELD:
            PermissionFlagsBits.SendMessages |
            PermissionFlagsBits.SendMessagesInThreads |
            PermissionFlagsBits.AddReactions |
            PermissionFlagsBits.CreatePublicThreads |
            PermissionFlagsBits.CreatePrivateThreads,
    } as const;

    constructor(data: typeof schema.projectMute.$inferSelect) {
        this.id = data.id;
        this.projectId = data.projectId;
        this.userId = data.userId;
        this.timestamp = data.timestamp;
    }

    public getProject() {
        return Project.getByUUID(this.projectId);
    }

    public static async getAllByUserID(userId: string) {
        const result = await db.query.projectMute.findMany({
            where: sql.eq(schema.projectMute.userId, userId),
            orderBy: sql.desc(schema.projectMute.timestamp),
        });
        return result.map((entry) => new ProjectMute(entry));
    }

    public static async getAllByProjectID(projectId: string) {
        const result = await db.query.projectMute.findMany({
            where: sql.eq(schema.projectMute.projectId, projectId),
            orderBy: sql.desc(schema.projectMute.timestamp),
        });
        return result.map((entry) => new ProjectMute(entry));
    }

    public static async getByUserIDAndProjectID(userId: string, projectId: string) {
        const result = await db.query.projectMute.findFirst({
            where: sql.and(sql.eq(schema.projectMute.userId, userId), sql.eq(schema.projectMute.projectId, projectId)),
        });

        if (!result) return Promise.reject('The user is not muted in the specified project.');
        return new ProjectMute(result);
    }

    public static async create(project: Project, user: User, ownerId: string) {
        project.assertNotArchived();

        const member = await userToMember(user);
        if (member && member.permissions.has(PermissionFlagsBits.KickMembers)) return Promise.reject('You can not mute this member.');
        if (project.ownerIds.includes(user.id)) return Promise.reject('You can not mute a channel owner.');

        const channel = project.getChannel();

        const data = {
            projectId: project.id,
            userId: user.id,
            timestamp: new Date(),
        } satisfies typeof schema.projectMute.$inferInsert;

        const result = await db.insert(schema.projectMute).values(data).returning({ id: schema.projectMute.id });

        if (result.length === 0) return Promise.reject('Failed to create project mute.');
        const { id } = result[0];

        const projectMute = new ProjectMute({ id, ...data });
        await projectMute.applyPermissions(channel);

        const logString = `${parseUser(ownerId)} muted ${parseUser(user)} in their project <#${channel.id}> (${project.id}).\n\n**Created At:** ${formatTimeDate(data.timestamp)}\n-# ${id}`;

        log(logString, 'Project Create Mute');
        return logString;
    }

    public async applyPermissions(channel?: TextChannel) {
        if (!channel) {
            const project = await this.getProject();
            channel = project.getChannel();
        }

        await channel.permissionOverwrites.edit(this.userId, ProjectMute.MUTE_OVERWRITES.APPLY, {
            type: OverwriteType.Member,
            reason: 'Apply project mute permissions.',
        });
    }

    public async lift(ownerId: string) {
        const project = await this.getProject();
        const channel = project.getChannel();

        const result = await db.delete(schema.projectMute).where(sql.eq(schema.projectMute.id, this.id));
        if (result.rowCount === 0) return Promise.reject(`Failed to delete project mute.`);

        const currentOverwrite = channel.permissionOverwrites.cache.get(this.userId);

        if (currentOverwrite) {
            if (currentOverwrite.allow.equals(0n) && currentOverwrite.deny.equals(ProjectMute.MUTE_OVERWRITES.BITFIELD)) await currentOverwrite.delete('Lift project mute.');
            else await currentOverwrite.edit(ProjectMute.MUTE_OVERWRITES.LIFT, 'Lift project mute.');
        }

        const logString = `${parseUser(ownerId)} unmuted ${parseUser(this.userId)} in their project <#${channel.id}> (${project.id}).\n\n**Created At:** ${formatTimeDate(
            this.timestamp,
        )}\n-# ${this.id}`;

        log(logString, 'Project Lift Mute');
        return logString;
    }

    public static async deleteAllByProjectID(projectId: string) {
        const result = await db.delete(schema.projectMute).where(sql.eq(schema.projectMute.projectId, projectId));
        return result.rowCount;
    }

    public toString() {
        return `**User:** ${parseUser(this.userId)}\n**Created At:** ${formatTimeDate(this.timestamp)}\n-# ${this.id}`;
    }
}
