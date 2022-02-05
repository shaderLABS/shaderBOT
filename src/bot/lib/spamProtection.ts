import { ButtonInteraction, Message, MessageActionRow, MessageButton, MessageEmbed, Permissions, TextChannel } from 'discord.js';
import { db } from '../../db/postgres.js';
import { client, settings } from '../bot.js';
import { GuildMessage } from '../events/message/messageCreate.js';
import { embedColor, replyError, replyInfo } from './embeds.js';
import { kickSpammer } from './kickUser.js';
import log from './log.js';
import { isTextOrThreadChannel, parseUser, similarityLevenshtein, userToMember } from './misc.js';
import { mute, unmute } from './muteUser.js';

type cachedMessage = {
    id: string;
    authorID: string;
    channelID: string;
    content: string;
    createdTimestamp: number;
};

const cache: (cachedMessage | undefined)[] = new Array(settings.spamProtection.cacheLength);

export async function handleSpamInteraction(interaction: ButtonInteraction) {
    if (!interaction.guild || (!interaction.customId.startsWith('kickSpam') && !interaction.customId.startsWith('forgiveSpam')) || !interaction.memberPermissions?.has(Permissions.FLAGS.KICK_MEMBERS))
        return;

    const id = interaction.customId.split(':')[1];
    if (!id) return;

    const targetUser = await client.users.fetch(id).catch(() => undefined);
    if (!targetUser) return replyError(interaction, "Failed to resolve the spammer's ID. Please deal with them manually.", undefined, false);
    const targetMember = await userToMember(interaction.guild, id);

    if (interaction.customId.startsWith('kickSpam')) {
        const { dmed } = await kickSpammer(targetUser, interaction.user.id, interaction.message instanceof Message ? interaction.message.url : undefined);
        replyInfo(interaction, `${parseUser(interaction.user)} kicked ${parseUser(targetUser)} for spamming. ${dmed ? '' : '\n\n*The target could not be DMed.*'}`, 'Kick Spammer');
    } else {
        unmute(id, interaction.user.id, targetMember).catch(() => undefined);
        replyInfo(interaction, `${parseUser(interaction.user)} forgave ${parseUser(targetUser)}.`, 'Forgive Spammer');
    }

    const message = interaction.message;
    if (message instanceof Message) message.edit({ components: [] });
}

export async function checkSpam(message: GuildMessage) {
    // don't handle message where spam is unlikely
    if (message.attachments.size || message.content.length < settings.spamProtection.characterThreshold) return false;

    // mentions everyone and contains a link
    let isSpamSingleMessage =
        !message.member.roles.color &&
        !message.member.permissions.has(Permissions.FLAGS.MENTION_EVERYONE) &&
        (message.content.includes('@everyone') || message.content.includes('@here')) &&
        message.content.includes('http');

    const currentMessage = {
        id: message.id,
        content: message.content,
        authorID: message.author.id,
        channelID: message.channel.id,
        createdTimestamp: message.createdTimestamp,
    };

    // if not already flagged as spam, do regular spam check
    let isSpamSimilarMessage = false;
    if (!isSpamSingleMessage) {
        const potentialSpam = cache.filter(
            (previousMessage) =>
                previousMessage &&
                currentMessage.authorID === previousMessage.authorID &&
                similarityLevenshtein(currentMessage.content, previousMessage.content) > settings.spamProtection.similarityThreshold &&
                currentMessage.channelID !== previousMessage.channelID &&
                currentMessage.createdTimestamp - previousMessage.createdTimestamp < settings.spamProtection.timeThreshold * 1000
        );

        isSpamSimilarMessage = potentialSpam.length >= settings.spamProtection.messageThreshold - 1;
    }

    // if message is flagged as spam, mute and delete messages
    if (isSpamSingleMessage || isSpamSimilarMessage) {
        const isPunished = !!(await db.query(/*sql*/ `SELECT 1 FROM punishment WHERE user_id = $1 LIMIT 1;`, [message.author.id])).rows[0];

        if (!isPunished) {
            mute(
                message.author.id,
                settings.spamProtection.muteDuration,
                null,
                isSpamSingleMessage ? 'Attempting to ping everyone.' : 'Spamming messages in multiple channels.',
                null,
                message.member
            ).catch((e) => log(`Failed to mute ${parseUser(message.author)} due to spam: ${e}`, 'Mute'));

            const kickButton = new MessageButton({
                customId: 'kickSpam:' + message.author.id,
                style: 'DANGER',
                label: 'Kick',
            });

            const forgiveButton = new MessageButton({
                customId: 'forgiveSpam:' + message.author.id,
                style: 'SUCCESS',
                label: 'Forgive',
            });

            const logEmbed = new MessageEmbed({
                author: {
                    name: 'Potential Spam',
                    iconURL: message.author.displayAvatarURL(),
                },
                description: `**User:** ${parseUser(message.author)}\n\n\`\`\`${message.content}\`\`\``,
                color: embedColor.red,
            });

            const logChannel = message.guild.channels.cache.get(settings.logging.moderationChannelID);
            if (logChannel && logChannel instanceof TextChannel) {
                logChannel.send({
                    embeds: [logEmbed],
                    components: [
                        new MessageActionRow({
                            components: [kickButton, forgiveButton],
                        }),
                    ],
                });
            }
        }

        const spamMessages = cache.filter((previousMessage) => previousMessage && message.author.id === previousMessage.authorID) as cachedMessage[];

        message.delete().catch(() => undefined);
        for (const spam of spamMessages) {
            const spamChannel = message.guild.channels.cache.get(spam.channelID);
            if (spamChannel && isTextOrThreadChannel(spamChannel)) {
                spamChannel.messages.delete(spam.id).catch(() => undefined);
            }
        }
    }

    // rotate cache
    cache.unshift(currentMessage);
    cache.pop();

    return isSpamSingleMessage || isSpamSimilarMessage;
}
