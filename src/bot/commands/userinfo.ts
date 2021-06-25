import { MessageEmbed } from 'discord.js';
import { Command } from '../commandHandler.js';
import { embedColor, embedIcon, sendError } from '../lib/embeds.js';
import { getMember, requireUser } from '../lib/searchMessage.js';
import { formatTimeDate, secondsToString } from '../lib/time.js';

export const command: Command = {
    commands: ['userinfo', 'info'],
    expectedArgs: '[@user|userID|username]',
    help: 'Display information about a specified user or yourself.',
    minArgs: 0,
    maxArgs: null,
    callback: async (message, _, text) => {
        const { channel } = message;

        try {
            const member = text ? await getMember(text) : message.member;
            const user = member?.user || (await requireUser(text));

            const embed = new MessageEmbed({
                author: {
                    name: user.tag,
                    iconURL: embedIcon.info,
                },
                color: embedColor.blue,
                description: user.toString(),
                fields: [
                    {
                        name: 'ID',
                        value: user.id,
                        inline: false,
                    },
                    {
                        name: 'Registered At',
                        value: `${formatTimeDate(user.createdAt)}${member?.joinedAt ? '\n' : ' '}(${secondsToString(Math.floor((Date.now() - user.createdAt.getTime()) / 1000))})`,
                        inline: true,
                    },
                ],
                image: {
                    url: user.displayAvatarURL({ dynamic: true, size: 256 }),
                },
            });

            if (member) {
                if (member.joinedAt) embed.addField('Joined At', `${formatTimeDate(member.joinedAt)}\n(${secondsToString(Math.floor((Date.now() - member.joinedAt.getTime()) / 1000))})`, true);

                const roles = member.roles.cache
                    .sort((a, b) => b.position - a.position)
                    .keyArray()
                    .filter((id) => id !== member.guild.roles.everyone.id);

                if (roles.length !== 0) embed.addField('Roles', `<@&${roles.join('>, <@&')}>`);
            }

            channel.send({ embeds: [embed] });
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
