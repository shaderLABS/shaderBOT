import { EmbedBuilder, GuildMember, User } from 'discord.js';
import { ChatInputCommandCallback } from '../../chatInputCommandHandler.js';
import { EmbedColor, EmbedIcon } from '../../lib/embeds.js';
import { userToMember } from '../../lib/misc.js';
import { formatRelativeTime } from '../../lib/time.js';

export function getUserInfoEmbed(targetUser: User, targetMember?: GuildMember) {
    const embed = new EmbedBuilder({
        author: {
            name: targetUser.username,
            iconURL: EmbedIcon.Info,
        },
        color: EmbedColor.Blue,
        description: targetUser.toString(),
        fields: [
            {
                name: 'ID',
                value: targetUser.id,
                inline: false,
            },
            {
                name: 'Registered',
                value: formatRelativeTime(targetUser.createdAt),
                inline: true,
            },
        ],
        image: {
            url: targetUser.displayAvatarURL({ size: 256 }),
        },
    });

    if (targetMember) {
        if (targetMember.joinedAt) embed.addFields([{ name: 'Joined', value: formatRelativeTime(targetMember.joinedAt), inline: true }]);

        const roles = [...targetMember.roles.cache.sort((a, b) => b.position - a.position).keys()].filter((id) => id !== targetMember.guild.roles.everyone.id);
        if (roles.length !== 0) embed.addFields([{ name: 'Roles', value: `<@&${roles.join('>, <@&')}>` }]);
    }

    return embed;
}

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', false) || interaction.user;
        const targetMember = await userToMember(targetUser.id, interaction.guild);

        interaction.reply({ embeds: [getUserInfoEmbed(targetUser, targetMember)] });
    },
};
