import { MessageEmbed } from 'discord.js';
import { GuildCommandInteraction } from '../../events/interactionCreate.js';
import { embedColor, embedIcon } from '../../lib/embeds.js';
import { userToMember } from '../../lib/misc.js';
import { formatRelativeTime } from '../../lib/time.js';
import { ApplicationCommandCallback } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', false) || interaction.user;
        const targetMember = await userToMember(interaction.guild, targetUser.id);

        const embed = new MessageEmbed({
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
                url: targetUser.displayAvatarURL({ dynamic: true, size: 256 }),
            },
        });

        if (targetMember) {
            if (targetMember.joinedAt) embed.addField('Joined', formatRelativeTime(targetMember.joinedAt), true);

            const roles = [...targetMember.roles.cache.sort((a, b) => b.position - a.position).keys()].filter((id) => id !== targetMember.guild.roles.everyone.id);
            if (roles.length !== 0) embed.addField('Roles', `<@&${roles.join('>, <@&')}>`);
        }

        interaction.reply({ embeds: [embed] });
    },
};
