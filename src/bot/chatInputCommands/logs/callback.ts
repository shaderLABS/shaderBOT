import { PermissionFlagsBits, User } from 'discord.js';
import { ChatInputCommandCallback } from '../../chatInputCommandHandler.js';
import { getPunishmentPoints } from '../../lib/automaticPunishment.js';
import { BanAppeal } from '../../lib/banAppeal.js';
import { replyButtonPages } from '../../lib/embeds.js';
import { Note } from '../../lib/note.js';
import { Ban, LiftedBan } from '../../lib/punishment/ban.js';
import { Kick } from '../../lib/punishment/kick.js';
import { LiftedMute, Mute } from '../../lib/punishment/mute.js';
import { Warning } from '../../lib/warning.js';

export async function getUserModerationLogPages(targetUser: User) {
    const queries = await Promise.all([
        Warning.getAllByUserID(targetUser.id),
        Note.getAllByUserID(targetUser.id),
        Ban.getByUserID(targetUser.id).catch(() => undefined),
        Mute.getByUserID(targetUser.id).catch(() => undefined),
        Kick.getAllByUserID(targetUser.id),
        LiftedBan.getAllByUserID(targetUser.id),
        LiftedMute.getAllByUserID(targetUser.id),
        BanAppeal.getAllByUserID(targetUser.id),
    ]);

    let pages: string[] = [];
    const quickInformation: string[] = [];

    function pageCategory(title: string, content: string[]) {
        const totalPageCount = Math.ceil(content.length / 3);

        content.reduce((page, entry, index, { length }) => {
            if ((index + 1) % 3 === 0 || index === length - 1) {
                pages.push(page + '\n\n' + entry);
                return `**${title}**\nPage ${Math.ceil(index / 3) + 1} / ${totalPageCount}`;
            }

            return page + '\n\n' + entry;
        }, `**${title}**\nPage 1 / ${totalPageCount}`);
    }

    function pageSingle(title: string, content: string) {
        pages.push(`**${title}**\n\n${content}`);
    }

    if (queries[0].length) {
        pageCategory(
            `Warnings (${queries[0].length})`,
            queries[0].map((warning) => warning.toString(false))
        );
    }

    if (queries[1].length) {
        pageCategory(
            `Notes (${queries[1].length})`,
            queries[1].map((note) => note.toString(false))
        );
    }

    if (queries[2]) {
        pageSingle('Current Ban', queries[2].toString(false));
        quickInformation.push('Banned');
    }

    if (queries[3]) {
        pageSingle('Current Mute', queries[3].toString(false));
        quickInformation.push('Muted');
    }

    if (queries[4].length) {
        pageCategory(
            `Kicks (${queries[4].length})`,
            queries[4].map((kick) => kick.toString(false))
        );
    }

    if (queries[5].length) {
        pageCategory(
            `Lifted Bans (${queries[5].length})`,
            queries[5].map((liftedBan) => liftedBan.toString(false))
        );
    }

    if (queries[6].length) {
        pageCategory(
            `Lifted Mutes (${queries[6].length})`,
            queries[6].map((liftedMute) => liftedMute.toString(false))
        );
    }

    if (queries[7].length) {
        pageCategory(
            `Ban Appeals (${queries[7].length})`,
            queries[7].map((banAppeal) => banAppeal.toString(false))
        );
    }

    if (!pages[0]) pages[0] = 'There are no entries for this user.';

    const punishmentPoints = await getPunishmentPoints(targetUser.id);
    if (punishmentPoints !== 0) quickInformation.push(`${punishmentPoints} Punishment Points`);

    return { pages, quickInformation: quickInformation.join(' • ') };
}

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);

        const { pages, quickInformation } = await getUserModerationLogPages(targetUser);
        replyButtonPages(interaction, pages, `Moderation Logs - ${targetUser.username}`, undefined, undefined, undefined, quickInformation);
    },
};
