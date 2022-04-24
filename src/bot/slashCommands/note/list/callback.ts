import { embedColor, embedIcon, replyButtonPages, replyError } from '../../../lib/embeds.js';
import { Note } from '../../../lib/note.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KickMembers'],
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);

        const notes = await Note.getAllByUserID(targetUser.id);
        if (notes.length === 0) return replyError(interaction, 'The specified user does not have any notes.');

        const pages: string[] = [];
        notes.reduce((prev, curr, i, { length }) => {
            const page = curr.toString();

            if ((i + 1) % 3 === 0 || i === length - 1) {
                pages.push(prev + '\n\n' + page);
                return '';
            }

            return prev + '\n\n' + page;
        }, '');

        replyButtonPages(interaction, pages, 'Notes', embedColor.yellow, embedIcon.note);
    },
};
