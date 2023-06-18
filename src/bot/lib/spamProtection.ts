import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, EmbedBuilder, PermissionFlagsBits, User } from 'discord.js';
import { client, settings } from '../bot.js';
import { GuildMessage } from '../events/message/messageCreate.js';
import { EmbedColor, replyError, replyInfo, sendInfo } from './embeds.js';
import log from './log.js';
import { getGuild, parseUser, similarityLevenshtein } from './misc.js';
import { PastPunishment, Punishment } from './punishment.js';

type CachedMessage = {
    id: string;
    authorID: string;
    channelID: string;
    content: string;
    createdTimestamp: number;
};

const cache: (CachedMessage | undefined)[] = new Array(settings.data.spamProtection.cacheLength);
const interactionUserLocks = new Set<string>();

export async function handleSpamInteraction(interaction: ButtonInteraction<'cached'>) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers)) return replyError(interaction, undefined, 'Insufficient Permissions');

    const id = interaction.customId.split(':')[1];
    if (!id || interactionUserLocks.has(id)) return;
    interactionUserLocks.add(id);

    interaction.message.edit({ components: [] }).then(() => {
        interactionUserLocks.delete(id);
    });

    const targetUser = await client.users.fetch(id).catch(() => undefined);
    if (!targetUser) return replyError(interaction, "Failed to resolve the spammer's ID. Please deal with them manually.", undefined, false);

    const mute = await Punishment.getByUserID(id, 'mute').catch(() => undefined);

    if (interaction.customId.startsWith('kickSpam')) {
        await kickSpammer(targetUser, interaction.user.id, interaction.message.url);
        mute?.move(interaction.user.id).catch(() => undefined);
        replyInfo(interaction, `${parseUser(interaction.user)} kicked ${parseUser(targetUser)}.`, 'Kick Spammer');
    } else {
        mute?.move(interaction.user.id).catch(() => undefined);
        replyInfo(interaction, `${parseUser(interaction.user)} forgave ${parseUser(targetUser)}.`, 'Forgive Spammer');
    }
}

export async function checkSpam(message: GuildMessage) {
    // don't handle message where spam is unlikely
    if (message.attachments.size || message.content.length < settings.data.spamProtection.characterThreshold) return;

    // mentions everyone and contains a link
    let isSpamSingleMessage =
        !message.member.roles.color &&
        !message.member.permissions.has(PermissionFlagsBits.MentionEveryone) &&
        (message.content.includes('@everyone') || message.content.includes('@here')) &&
        message.content.includes('http');

    const currentMessage = {
        id: message.id,
        content: message.content,
        authorID: message.author.id,
        channelID: message.channelId,
        createdTimestamp: message.createdTimestamp,
    };

    // if not already flagged as spam, do regular spam check
    let isSpamSimilarMessage = false;
    if (!isSpamSingleMessage) {
        const potentialSpam = cache.filter(
            (previousMessage) =>
                previousMessage &&
                currentMessage.authorID === previousMessage.authorID &&
                similarityLevenshtein(currentMessage.content, previousMessage.content) > settings.data.spamProtection.similarityThreshold &&
                currentMessage.channelID !== previousMessage.channelID &&
                currentMessage.createdTimestamp - previousMessage.createdTimestamp < settings.data.spamProtection.timeThreshold * 1000
        );

        isSpamSimilarMessage = potentialSpam.length >= settings.data.spamProtection.messageThreshold - 1;
    }

    // if message is flagged as spam, mute and delete messages
    if (isSpamSingleMessage || isSpamSimilarMessage) {
        const spamMessages = cache
            .filter((previousMessage): previousMessage is NonNullable<typeof previousMessage> => previousMessage !== undefined && message.author.id === previousMessage.authorID)
            .reverse();

        spamMessages.push(currentMessage);

        if (!(await Punishment.has(message.author.id, 'mute'))) {
            Punishment.createMute(message.author, isSpamSingleMessage ? 'Attempting to ping everyone.' : 'Spamming messages in multiple channels.', settings.data.spamProtection.muteDuration).catch(
                (error) => log(`Failed to mute ${parseUser(message.author)} due to spam: ${error}`, 'Mute')
            );

            const kickButton = new ButtonBuilder({
                customId: 'kickSpam:' + message.author.id,
                style: ButtonStyle.Danger,
                label: 'Kick',
            });

            const forgiveButton = new ButtonBuilder({
                customId: 'forgiveSpam:' + message.author.id,
                style: ButtonStyle.Success,
                label: 'Forgive',
            });

            const logEmbed = new EmbedBuilder({
                author: {
                    name: 'Potential Spam',
                    iconURL: message.author.displayAvatarURL(),
                },
                description: `**User:** ${parseUser(message.author)}\n**Channels:** <#${spamMessages.map((message) => message.channelID).join('>, <#')}>\n\n\`\`\`${message.content}\`\`\``,
                color: EmbedColor.Red,
            });

            const logChannel = client.channels.cache.get(settings.data.logging.moderationChannelID);
            if (logChannel?.type === ChannelType.GuildText) {
                logChannel.send({
                    embeds: [logEmbed],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>({
                            components: [kickButton, forgiveButton],
                        }),
                    ],
                });
            }
        }

        for (const spam of spamMessages) {
            const spamChannel = client.channels.cache.get(spam.channelID);
            if (spamChannel && (spamChannel.type === ChannelType.GuildText || spamChannel.type === ChannelType.GuildVoice || spamChannel.isThread())) {
                spamChannel.messages.delete(spam.id).catch(() => undefined);
            }
        }
    }

    // rotate cache
    cache.unshift(currentMessage);
    cache.pop();
}

export async function kickSpammer(user: User, moderatorID?: string, contextURL?: string) {
    const guild = getGuild();

    await sendInfo(
        user,
        `Your account has been used for spam. Please [reset your password](https://support.discord.com/hc/en-us/articles/218410947-I-forgot-my-Password-Where-can-I-set-a-new-one- "Guide for resetting your password"). After that, feel free to rejoin ${guild.name} using [this invite link](${settings.data.spamProtection.inviteURL} "Invite for ${guild.name}").`,
        'Your account has been compromised.',
        undefined,
        "DON'T FALL FOR PHISHING! ALWAYS CHECK THE URL BEFORE SIGNING IN. NEVER SCAN ANY QR CODES."
    ).catch(() => undefined);

    try {
        const logString = await PastPunishment.createKick(user, 'Phished account used for spam.', moderatorID, contextURL, 86400);
        return logString;
    } catch (error) {
        console.error(error);
        return `Failed to kick ${parseUser(user)}.`;
    }
}
