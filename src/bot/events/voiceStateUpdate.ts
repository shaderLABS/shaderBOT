import { ChannelType, EmbedBuilder, Events } from 'discord.js';
import { settings } from '../bot.js';
import { Event } from '../eventHandler.js';
import { EmbedColor } from '../lib/embeds.js';
import { getGuild, parseUser } from '../lib/misc.js';

export const event: Event = {
    name: Events.VoiceStateUpdate,
    callback: (oldVoiceState, newVoiceState) => {
        if (!oldVoiceState.channel && newVoiceState.channel) {
            const logChannel = getGuild()?.channels.cache.get(settings.data.logging.messageChannelID);
            if (logChannel?.type === ChannelType.GuildText) {
                const { member, channel } = newVoiceState;
                if (!member) return;

                logChannel.send({
                    embeds: [
                        new EmbedBuilder({
                            color: EmbedColor.Blue,
                            author: {
                                name: 'Join Voice Channel',
                                iconURL: member.displayAvatarURL(),
                            },
                            description: `${parseUser(member.user)} joined <#${channel.id}>.`,
                        }),
                    ],
                });
            }
        } else if (oldVoiceState.channel && !newVoiceState.channel) {
            const logChannel = getGuild()?.channels.cache.get(settings.data.logging.messageChannelID);
            if (logChannel?.type === ChannelType.GuildText) {
                const { member, channel } = oldVoiceState;
                if (!member) return;

                logChannel.send({
                    embeds: [
                        new EmbedBuilder({
                            color: EmbedColor.Blue,
                            author: {
                                name: 'Leave Voice Channel',
                                iconURL: member.displayAvatarURL(),
                            },
                            description: `${parseUser(member.user)} left <#${channel.id}>.`,
                        }),
                    ],
                });
            }
        }
    },
};
