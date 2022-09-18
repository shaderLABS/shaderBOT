import { ChannelType, EmbedBuilder, Events } from 'discord.js';
import { settings } from '../bot.js';
import { Event } from '../eventHandler.js';
import { EmbedColor } from '../lib/embeds.js';
import { getGuild, parseUser } from '../lib/misc.js';

export const event: Event = {
    name: Events.VoiceStateUpdate,
    callback: (oldVoiceState, newVoiceState) => {
        if (oldVoiceState.channelId === null && newVoiceState.channelId !== null) {
            const logChannel = getGuild()?.channels.cache.get(settings.data.logging.messageChannelID);
            if (logChannel?.type === ChannelType.GuildText) {
                const { member, channelId } = newVoiceState;
                if (!member) return;

                logChannel.send({
                    embeds: [
                        new EmbedBuilder({
                            color: EmbedColor.Blue,
                            author: {
                                name: 'Join Voice Channel',
                                iconURL: member.displayAvatarURL(),
                            },
                            description: `${parseUser(member.user)} joined <#${channelId}>.`,
                        }),
                    ],
                });
            }
        } else if (oldVoiceState.channelId !== null && newVoiceState.channelId === null) {
            const logChannel = getGuild()?.channels.cache.get(settings.data.logging.messageChannelID);
            if (logChannel?.type === ChannelType.GuildText) {
                const { member, channelId } = oldVoiceState;
                if (!member) return;

                logChannel.send({
                    embeds: [
                        new EmbedBuilder({
                            color: EmbedColor.Blue,
                            author: {
                                name: 'Leave Voice Channel',
                                iconURL: member.displayAvatarURL(),
                            },
                            description: `${parseUser(member.user)} left <#${channelId}>.`,
                        }),
                    ],
                });
            }
        } else if (oldVoiceState.channelId !== newVoiceState.channelId) {
            const logChannel = getGuild()?.channels.cache.get(settings.data.logging.messageChannelID);
            if (logChannel?.type === ChannelType.GuildText) {
                const { member } = oldVoiceState;
                if (!member) return;

                logChannel.send({
                    embeds: [
                        new EmbedBuilder({
                            color: EmbedColor.Blue,
                            author: {
                                name: 'Move Voice Channel',
                                iconURL: member.displayAvatarURL(),
                            },
                            description: `${parseUser(member.user)} moved from <#${oldVoiceState.channelId}> to <#${newVoiceState.channelId}>.`,
                        }),
                    ],
                });
            }
        }
    },
};
