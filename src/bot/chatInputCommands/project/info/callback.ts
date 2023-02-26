import { EmbedBuilder } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { EmbedColor, EmbedIcon, replyError } from '../../../lib/embeds.js';
import { Project } from '../../../lib/project.js';
import { formatRelativeTime } from '../../../lib/time.js';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        try {
            const project = await Project.getByChannelID(interaction.channelId);
            project.assertOwner(interaction.user.id).assertNotArchived();

            const subscriber_count = await project.getNotificationRole().then((role) => (role ? role.members.size : 0));
            const banner_information = await project.getBannerInformation().catch(() => undefined);
            let banner_information_string = 'There is no banner image set for this project.';

            if (banner_information) {
                banner_information_string = `The banner of this project will be used ${formatRelativeTime(banner_information.nextTimestamp)} or later.`;
                if (banner_information.lastTimestamp) banner_information_string += `\nIt was last used ${formatRelativeTime(banner_information.lastTimestamp)}.`;
            }

            const embed = new EmbedBuilder({
                author: {
                    name: 'Project Information',
                    iconURL: EmbedIcon.Info,
                },
                color: EmbedColor.Blue,
                fields: [
                    {
                        name: 'Banner',
                        value: banner_information_string,
                        inline: true,
                    },
                    {
                        name: 'Subscribers',
                        value: `${subscriber_count} ${subscriber_count === 1 ? 'member is' : 'members are'} subscribed to this project.`,
                        inline: true,
                    },
                ],
            });

            if (banner_information) embed.setImage(banner_information.bannerURL);

            interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
