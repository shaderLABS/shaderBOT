import { getPunishmentPoints } from '../../lib/automaticPunishment.js';
import { BanAppeal } from '../../lib/banAppeal.js';
import { replyButtonPages } from '../../lib/embeds.js';
import { Note } from '../../lib/note.js';
import { PastPunishment, Punishment } from '../../lib/punishment.js';
import { Warning } from '../../lib/warning.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KickMembers'],
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);

        const warningQuery = Warning.getAllByUserID(targetUser.id);
        const punishmentQuery = Punishment.getAllByUserID(targetUser.id);
        const noteQuery = Note.getAllByUserID(targetUser.id);
        const pastPunishmentQuery = PastPunishment.getAllByUserID(targetUser.id);
        const appealQuery = BanAppeal.getAllByUserID(targetUser.id);

        const queries = await Promise.all([warningQuery, punishmentQuery, noteQuery, pastPunishmentQuery, appealQuery]);

        let pages: string[] = [];
        function pageCategory(title: string, content: string[]) {
            content.reduce((prev, curr, i, arr) => {
                const isLast = i === arr.length - 1;
                if ((i + 1) % 3 === 0 || isLast) {
                    pages.push(isLast ? prev + '\n\n' + curr : prev + '\n\n' + curr + '\n\n_(continued on next page)_');
                    return '';
                }

                return prev + '\n\n' + curr;
            }, `**${title}**`);
        }

        if (queries[0].length) {
            pageCategory(
                `Warnings (${queries[0].length})`,
                queries[0].map((warning) => warning.toString(false))
            );
        }

        if (queries[1].length) {
            pageCategory(
                `Punishments (${queries[1].length})`,
                queries[1].map((punishment) => punishment.toString(false, true))
            );
        }

        if (queries[2].length) {
            pageCategory(
                `Notes (${queries[2].length})`,
                queries[2].map((note) => note.toString(false))
            );
        }

        if (queries[3].length) {
            pageCategory(
                `Past Punishments (${queries[3].length})`,
                queries[3].map((pastPunishment) => pastPunishment.toString(false, true))
            );
        }

        if (queries[4].length) {
            pageCategory(
                `Ban Appeals (${queries[4].length})`,
                queries[4].map((banAppeal) => banAppeal.toString(false))
            );
        }

        if (!pages[0]) pages[0] = 'There are no entries for this user.';

        const punishmentPoints = await getPunishmentPoints(targetUser.id);
        if (punishmentPoints !== 0) pages[0] = `**Punishment Points:** ${punishmentPoints}\n\n` + pages[0];

        replyButtonPages(interaction, pages, `Moderation Logs - ${targetUser.tag}`);
    },
};
