import { ButtonInteraction, Message, MessageActionRow, MessageButton, MessageEmbed, Permissions, TextChannel } from 'discord.js';
import { client, settings } from '../bot.js';
import { GuildMessage } from '../events/message/messageCreate.js';
import { embedColor, replyError, replyInfo } from './embeds.js';
import { kick } from './kickUser.js';
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
        if (!targetMember) return replyError(interaction, 'The spammer is not in this guild anymore.', undefined, false);
        kick(
            targetMember,
            interaction.user.id,
            'Your account has been compromised, please reset your password. After that, feel free to rejoin our server.',
            interaction.message instanceof Message ? interaction.message.url : undefined
        ).catch(() => undefined);
        replyInfo(interaction, `${parseUser(interaction.user)} kicked ${parseUser(targetUser)}.`, 'Kick Spammer');
    } else {
        unmute(id, interaction.user.id, targetMember).catch(() => undefined);
        replyInfo(interaction, `${parseUser(interaction.user)} forgave ${parseUser(targetUser)}.`, 'Forgive Spammer');
    }

    const message = interaction.message;
    if (message instanceof Message) message.edit({ components: [] });
}

export function checkSpam(message: GuildMessage) {
    if (message.attachments.size || message.content.length < settings.spamProtection.characterThreshold) return false;

    const currentMessage = {
        id: message.id,
        content: message.content,
        authorID: message.author.id,
        channelID: message.channel.id,
        createdTimestamp: message.createdTimestamp,
    };

    const potentialSpam = cache.filter(
        (previousMessage) =>
            previousMessage &&
            currentMessage.authorID === previousMessage.authorID &&
            similarityLevenshtein(currentMessage.content, previousMessage.content) > settings.spamProtection.similarityThreshold &&
            currentMessage.channelID !== previousMessage.channelID &&
            currentMessage.createdTimestamp - previousMessage.createdTimestamp < settings.spamProtection.timeThreshold * 1000
    );

    const isSpam = potentialSpam.length >= settings.spamProtection.messageThreshold - 1;
    if (isSpam) {
        mute(message.author.id, settings.spamProtection.muteDuration, null, 'Spamming messages in multiple channels.', null, message.member).catch((e) =>
            log(`Failed to mute ${parseUser(message.author)} due to spam: ${e}`, 'Mute')
        );

        const spamMessages = cache.filter((previousMessage) => previousMessage && message.author.id === previousMessage.authorID) as cachedMessage[];
        const guild = message.guild;

        message.delete().catch(() => undefined);

        for (const spam of spamMessages) {
            const spamChannel = guild.channels.cache.get(spam.channelID);
            if (spamChannel && isTextOrThreadChannel(spamChannel)) {
                spamChannel.messages.delete(spam.id).catch(() => undefined);
            }
        }

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

        const logChannel = guild.channels.cache.get(settings.logging.moderationChannelID);
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

    cache.unshift(currentMessage);
    cache.pop();

    return isSpam;
}
