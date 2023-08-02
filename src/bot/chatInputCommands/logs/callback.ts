import { PermissionFlagsBits, User } from 'discord.js';
import { ChatInputCommandCallback } from '../../chatInputCommandHandler.js';
import { getPunishmentPoints } from '../../lib/automaticPunishment.js';
import { BanAppeal } from '../../lib/banAppeal.js';
import { replyButtonPages } from '../../lib/embeds.js';
import { Note } from '../../lib/note.js';
import { PastPunishment, Punishment } from '../../lib/punishment.js';
import { Warning } from '../../lib/warning.js';

export async function getUserModerationLogPages(targetUser: User) {
    const queries = await Promise.all([
        Warning.getAllByUserID(targetUser.id),
        Punishment.getAllByUserID(targetUser.id),
        Note.getAllByUserID(targetUser.id),
        PastPunishment.getAllByUserID(targetUser.id),
        BanAppeal.getAllByUserID(targetUser.id),
    ]);

    let pages: string[] = [];
    function pageCategory(title: string, content: string[]) {
        content.reduce((page, entry, index, { length }) => {
            const isLast = index === length - 1;
            if ((index + 1) % 3 === 0 || isLast) {
                pages.push(isLast ? page + '\n\n' + entry : page + '\n\n' + entry + '\n\n_(continued on next page)_');
                return '';
            }

            return page + '\n\n' + entry;
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

    return pages;
}

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);

        const pages = await getUserModerationLogPages(targetUser);
        replyButtonPages(interaction, pages, `Moderation Logs - ${targetUser.username}`);
    },
};
