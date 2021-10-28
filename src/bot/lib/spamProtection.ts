import { ButtonInteraction, Message, MessageActionRow, MessageButton, MessageEmbed, Permissions, TextChannel } from 'discord.js';
import { client, settings } from '../bot.js';
import { GuildMessage } from '../events/message/messageCreate.js';
import { ban } from './banUser.js';
import { embedColor, replyError, replyInfo } from './embeds.js';
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
    if (!interaction.guild || (!interaction.customId.startsWith('banSpam') && !interaction.customId.startsWith('forgiveSpam')) || !interaction.memberPermissions?.has(Permissions.FLAGS.BAN_MEMBERS))
        return;

    const id = interaction.customId.split(':')[1];
    if (!id) return;

    const targetUser = await client.users.fetch(id).catch(() => undefined);
    if (!targetUser) return replyError(interaction, "Failed to resolve the spammer's ID. Please deal with them manually.", undefined, false);

    if (interaction.customId.startsWith('banSpam')) {
        ban(targetUser, undefined, 'Spamming messages in multiple channels.').catch(() => undefined);
        replyInfo(interaction, `${parseUser(interaction.user)} banned ${parseUser(targetUser)}.`, 'Ban Spammer');
    } else {
        const targetMember = await userToMember(interaction.guild, id);
        unmute(id, undefined, targetMember).catch(() => undefined);
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

        const banButton = new MessageButton({
            customId: 'banSpam:' + message.author.id,
            style: 'DANGER',
            label: 'Ban',
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
                        components: [banButton, forgiveButton],
                    }),
                ],
            });
        }
    }

    cache.unshift(currentMessage);
    cache.pop();

    return isSpam;
}
