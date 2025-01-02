import { AttachmentBuilder, blockQuote, ChannelType, EmbedBuilder, LimitedCollection, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { client, settings } from '../../../bot.ts';
import type { MessageContextMenuCommandCallback } from '../../../contextMenuCommandHandler.ts';
import { EmbedColor, replyError, replyInfo } from '../../../lib/embeds.ts';
import { isoLanguageCodeToFlagEmoji, isoLanguageCodeToName } from '../../../lib/languageCountryCode.ts';
import log from '../../../lib/log.ts';
import { parseUser } from '../../../lib/misc.ts';

type Translation = {
    language: string;
    languageConfidence: number;
    text: string;
    fetchedTimestamp: number;
};

const cache = new LimitedCollection<string, Translation>({ maxSize: settings.data.messageTranslation.cacheLength });

export const command: MessageContextMenuCommandCallback = {
    commandName: 'Translate',
    callback: async (interaction) => {
        const { targetMessage } = interaction;

        try {
            if (targetMessage.content.replaceAll(/https?:\/\/[\n\S]+/g, '').trim().length < 5) {
                replyInfo(interaction, undefined, 'The source text is empty or too short.', undefined, undefined, true);
                return;
            }

            const logEmbed = new EmbedBuilder({
                color: EmbedColor.Blue,
                author: {
                    name: 'Translate Message',
                    iconURL: interaction.user.displayAvatarURL(),
                    url: targetMessage.url,
                },
                footer: {
                    text: `ID: ${targetMessage.id}`,
                },
            });

            let translation: Translation;
            const translationID = targetMessage.id + ':' + targetMessage.editedTimestamp;

            const cachedTranslation = cache.get(translationID);
            if (cachedTranslation) {
                logEmbed.setDescription(
                    `${parseUser(interaction.user)} requested a translation for [this message](${targetMessage.url} "Jump to Message") (${targetMessage.id}). The translation was cached.`,
                );

                translation = cachedTranslation;
                cache.delete(translationID);
            } else {
                const recentlyFetchedDeadline = Date.now() - settings.data.messageTranslation.fetchCooldownTimeThreshold * 1000;
                const recentlyFetchedCount = cache.reduce((count, pastTranslation) => count + +(pastTranslation.fetchedTimestamp > recentlyFetchedDeadline), 0);

                if (recentlyFetchedCount > settings.data.messageTranslation.fetchCooldownCountThreshold && !interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
                    log(
                        `${parseUser(interaction.user)} requested a translation for [this message](${targetMessage.url} "Jump to Message") (${
                            targetMessage.id
                        }), but has hit the fetch rate limit. Look at the message log for more information.`,
                        'Translate Message Rate Limit',
                    );

                    replyInfo(interaction, undefined, 'There have been too many translation requests. Please try again later.', undefined, undefined, true);
                    return;
                }

                logEmbed.setDescription(
                    `${parseUser(interaction.user)} requested a translation for [this message](${targetMessage.url} "Jump to Message") (${targetMessage.id}). The translation was fetched.`,
                );

                const response = await fetch(
                    'https://translate.googleapis.com/translate_a/single?client=gtx&ie=UTF-8&oe=UTF-8&dt=bd&dt=ex&dt=ld&dt=md&dt=rw&dt=rm&dt=ss&dt=t&dt=at&dt=gt&dt=qca&sl=auto&tl=en&hl=en&q=' +
                        encodeURIComponent(targetMessage.content),
                    {
                        method: 'POST',
                        headers: {
                            DNT: '1',
                            Accept: 'application/json',
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0',
                        },
                    },
                );

                if (response.status !== 200) throw 'The API request failed with code ' + response.status + '.';
                const data = await response.json();

                translation = {
                    language: data[2],
                    languageConfidence: data[6],
                    text: data[0]?.reduce((text: string, chunk: (string | null)[]) => text + (chunk[0] ?? ''), ''),
                    fetchedTimestamp: Date.now(),
                };

                if (!translation.language || !translation.languageConfidence || !translation.text) throw 'The structure of the API response is invalid.';
            }

            cache.set(translationID, translation);

            const logChannel = client.channels.cache.get(settings.data.logging.messageChannelID);

            if (translation.language === 'en') {
                if (logChannel?.type === ChannelType.GuildText) logChannel.send({ embeds: [logEmbed.setDescription(logEmbed.data.description + '\n\nThe source text is already in English.')] });

                replyInfo(interaction, undefined, 'The source text is already in English.', undefined, undefined, true);
                return;
            }

            const header = `${isoLanguageCodeToFlagEmoji(translation.language)}  **[${isoLanguageCodeToName(translation.language)} (${Math.round(translation.languageConfidence * 100)}%)](${
                targetMessage.url
            } "Jump to Message")** _by ${targetMessage.author.toString()}_`;

            if (header.length + translation.text.length < 2000) {
                interaction.reply({
                    content: header + '\n' + blockQuote(translation.text),
                    flags: MessageFlags.Ephemeral | MessageFlags.SuppressEmbeds,
                    allowedMentions: { parse: [] },
                });

                if (logChannel?.type === ChannelType.GuildText) {
                    logChannel.send({ embeds: [logEmbed.setDescription(logEmbed.data.description + '\n\n' + header + '\n' + blockQuote(translation.text))] });
                }
            } else {
                interaction.reply({
                    content: header,
                    files: [new AttachmentBuilder(Buffer.from(translation.text), { name: 'translation.txt' })],
                    allowedMentions: { parse: [] },
                    flags: MessageFlags.Ephemeral,
                });

                if (logChannel?.type === ChannelType.GuildText) {
                    logChannel.send({
                        embeds: [logEmbed.setDescription(logEmbed.data.description + '\n\n' + header)],
                        files: [new AttachmentBuilder(Buffer.from(translation.text), { name: 'translation.txt' })],
                    });
                }
            }
        } catch (error) {
            console.error(error);
            replyError(interaction, 'An error occured while performing your translation request.');
        }
    },
};
