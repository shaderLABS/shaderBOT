import { EmbedBuilder } from 'discord.js';
import { embedColor, embedIcon } from '../../lib/embeds.js';
import { userToMember } from '../../lib/misc.js';
import { formatRelativeTime } from '../../lib/time.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', false) || interaction.user;
        const targetMember = await userToMember(interaction.guild, targetUser.id);

        const embed = new EmbedBuilder({
            author: {
                name: targetUser.tag,
                iconURL: embedIcon.info,
            },
            color: embedColor.blue,
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

        interaction.reply({ embeds: [embed] });
    },
};
