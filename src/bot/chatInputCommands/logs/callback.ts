import { type APIEmbedField, PermissionFlagsBits, User } from 'discord.js';
import type { ChatInputCommandCallback } from '../../chatInputCommandHandler.ts';
import { getPunishmentPoints } from '../../lib/automaticPunishment.ts';
import { BanAppeal } from '../../lib/banAppeal.ts';
import { replyButtonPages } from '../../lib/embeds.ts';
import { Note } from '../../lib/note.ts';
import { Ban, LiftedBan } from '../../lib/punishment/ban.ts';
import { Kick } from '../../lib/punishment/kick.ts';
import { LiftedMute, Mute } from '../../lib/punishment/mute.ts';
import { Track } from '../../lib/punishment/track.ts';
import { Warning } from '../../lib/warning.ts';

export async function getUserModerationLogPages(targetUser: User) {
    const queries = await Promise.all([
        Warning.getAllByUserID(targetUser.id),
        Note.getAllByUserID(targetUser.id),
        Ban.getByUserID(targetUser.id).catch(() => undefined),
        Mute.getByUserID(targetUser.id).catch(() => undefined),
        Track.getByUserID(targetUser.id).catch(() => undefined),
        Kick.getAllByUserID(targetUser.id),
        LiftedBan.getAllByUserID(targetUser.id),
        LiftedMute.getAllByUserID(targetUser.id),
        BanAppeal.getAllByUserID(targetUser.id),
    ]);

    let pages: string[] = [];
    const quickInformation: APIEmbedField[] = [];

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
        quickInformation.push({ name: 'Banned', value: 'Yes', inline: true });
    } else {
        quickInformation.push({ name: 'Banned', value: 'No', inline: true });
    }

    if (queries[3]) {
        pageSingle('Current Mute', queries[3].toString(false));
        quickInformation.push({ name: 'Muted', value: 'Yes', inline: true });
    } else {
        quickInformation.push({ name: 'Muted', value: 'No', inline: true });
    }

    if (queries[4]) {
        pageSingle('Track Entry', queries[4].toString(false));
        quickInformation.push({ name: 'Tracked', value: 'Yes', inline: true });
    } else {
        quickInformation.push({ name: 'Tracked', value: 'No', inline: true });
    }

    if (queries[5].length) {
        pageCategory(
            `Kicks (${queries[5].length})`,
            queries[5].map((kick) => kick.toString(false))
        );
    }

    if (queries[6].length) {
        pageCategory(
            `Lifted Bans (${queries[6].length})`,
            queries[6].map((liftedBan) => liftedBan.toString(false))
        );
    }

    if (queries[7].length) {
        pageCategory(
            `Lifted Mutes (${queries[7].length})`,
            queries[7].map((liftedMute) => liftedMute.toString(false))
        );
    }

    if (queries[8].length) {
        pageCategory(
            `Ban Appeals (${queries[8].length})`,
            queries[8].map((banAppeal) => banAppeal.toString(false))
        );
    }

    if (!pages[0]) pages[0] = 'There are no entries for this user.';

    const punishmentPoints = await getPunishmentPoints(targetUser.id);
    if (punishmentPoints !== 0) quickInformation.push({ name: 'Punishment Points', value: punishmentPoints.toString(), inline: true });

    return { pages, quickInformation };
}

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);

        const { pages, quickInformation } = await getUserModerationLogPages(targetUser);
        replyButtonPages(interaction, pages, `Moderation Logs - ${targetUser.username}`, undefined, undefined, undefined, quickInformation);
    },
};
