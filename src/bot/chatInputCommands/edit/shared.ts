import { User } from 'discord.js';
import { Query } from '../../../db/query.ts';
import { client } from '../../bot.ts';
import type { GuildChatInputCommandInteraction } from '../../chatInputCommandHandler.ts';
import { PUNISHMENT_TABLEOID_TO_SCHEMA, type PunishmentTable, editContextURL } from '../../lib/context.ts';
import { replyError, replySuccess } from '../../lib/embeds.ts';
import { Note } from '../../lib/note.ts';
import { Ban, LiftedBan } from '../../lib/punishment/ban.ts';
import { Kick } from '../../lib/punishment/kick.ts';
import { LiftedMute, Mute } from '../../lib/punishment/mute.ts';
import { Track } from '../../lib/punishment/track.ts';
import { hasPermissionForTarget } from '../../lib/searchMessage.ts';
import { splitString, stringToSeconds } from '../../lib/time.ts';
import { Warning } from '../../lib/warning.ts';

async function requireContext(value: string) {
    const IDs = value.split('/');
    const messageID = IDs.pop();
    const channelID = IDs.pop();

    if (!messageID || !channelID) return Promise.reject('The specified message URL is invalid.');

    const channel = client.channels.cache.get(channelID);
    if (!channel?.isTextBased()) return Promise.reject('The specified message URL points to an invalid channel.');

    const message = await channel.messages.fetch(messageID);
    if (!message) return Promise.reject('The specified message URL points to an invalid message.');

    return message.url;
}

export async function editApsect(interaction: GuildChatInputCommandInteraction, target: string | User) {
    const aspect = interaction.options.getString('aspect', true);
    const value = interaction.options.getString('value', true);

    try {
        switch (aspect) {
            case 'banduration': {
                const time = stringToSeconds(splitString(value));

                const ban = target instanceof User ? await Ban.getByUserID(target.id) : await Ban.getByUUID(target);
                if (!(await hasPermissionForTarget(interaction, ban.userId))) return;
                const logString = await ban.editDuration(time, interaction.user.id);

                replySuccess(interaction, logString, 'Edit Ban Duration');
                break;
            }

            case 'banreason': {
                let ban: Ban | LiftedBan | undefined;
                if (target instanceof User) {
                    ban = await Ban.getByUserID(target.id).catch(() => undefined);
                    ban ??= await LiftedBan.getLatestByUserID(target.id).catch(() => undefined);

                    if (!ban) {
                        replyError(interaction, 'The specified user does not have any bans.');
                        return;
                    }
                } else {
                    ban = await Ban.getByUUID(target).catch(() => undefined);
                    ban ??= await LiftedBan.getByUUID(target).catch(() => undefined);

                    if (!ban) {
                        replyError(interaction, 'A ban with the specified UUID does not exist.');
                        return;
                    }
                }

                if (!(await hasPermissionForTarget(interaction, ban.userId))) return;
                const logString = await ban.editReason(value, interaction.user.id);

                replySuccess(interaction, logString, 'Edit Ban Reason');
                break;
            }

            case 'trackreason': {
                const track = target instanceof User ? await Track.getByUserID(target.id) : await Track.getByUUID(target);
                const logString = await track.editReason(value, interaction.user.id);

                replySuccess(interaction, logString, 'Edit Track Reason');
                break;
            }

            case 'kickreason': {
                const kick = target instanceof User ? await Kick.getLatestByUserID(target.id) : await Kick.getByUUID(target);
                if (!(await hasPermissionForTarget(interaction, kick.userId))) return;
                const logString = await kick.editReason(value, interaction.user.id);

                replySuccess(interaction, logString, 'Edit Kick Reason');
                break;
            }

            case 'muteduration': {
                const time = stringToSeconds(splitString(value));

                const mute = target instanceof User ? await Mute.getByUserID(target.id) : await Mute.getByUUID(target);
                if (!(await hasPermissionForTarget(interaction, mute.userId, 'moderatable'))) return;
                const logString = await mute.editDuration(time, interaction.user.id);

                replySuccess(interaction, logString, 'Edit Mute Duration');
                break;
            }

            case 'mutereason': {
                let mute: Mute | LiftedMute | undefined;
                if (target instanceof User) {
                    mute = await Mute.getByUserID(target.id).catch(() => undefined);
                    mute ??= await LiftedMute.getLatestByUserID(target.id).catch(() => undefined);

                    if (!mute) {
                        replyError(interaction, 'The specified user does not have any mutes.');
                        return;
                    }
                } else {
                    mute = await Mute.getByUUID(target).catch(() => undefined);
                    mute ??= await LiftedMute.getByUUID(target).catch(() => undefined);

                    if (!mute) {
                        replyError(interaction, 'A mute with the specified UUID does not exist.');
                        return;
                    }
                }

                if (!(await hasPermissionForTarget(interaction, mute.userId))) return;
                const logString = await mute.editReason(value, interaction.user.id);

                replySuccess(interaction, logString, 'Edit Mute Reason');
                break;
            }

            case 'note': {
                const note = target instanceof User ? await Note.getLatestByUserID(target.id) : await Note.getByUUID(target);
                const logString = await note.editContent(value, interaction.user.id);

                interaction.reply({ embeds: [Note.toEmbed('Edit Note', logString)] });
                break;
            }

            case 'warnreason': {
                const warning = target instanceof User ? await Warning.getLatestByUserID(target.id) : await Warning.getByUUID(target);
                if (!(await hasPermissionForTarget(interaction, warning.userId))) return;

                const logString = await warning.editReason(value, interaction.user.id);
                replySuccess(interaction, logString, 'Edit Warning Reason');
                break;
            }

            case 'warnseverity': {
                const warning = target instanceof User ? await Warning.getLatestByUserID(target.id) : await Warning.getByUUID(target);
                if (!(await hasPermissionForTarget(interaction, warning.userId))) return;

                const logString = await warning.editSeverity(Number.parseInt(value), interaction.user.id);
                replySuccess(interaction, logString, 'Edit Warning Severity');
                break;
            }

            case 'context': {
                const context = await requireContext(value);

                let uuid: string;
                let table: PunishmentTable;

                if (target instanceof User) {
                    const [entry] = await Query.Context.LATEST_BY_USERID.execute({ userId: target.id });

                    if (!entry) {
                        replyError(interaction, 'The specified user does not have any entries.');
                        return;
                    }

                    if (!(await hasPermissionForTarget(interaction, target))) return;

                    uuid = entry.id;
                    table = PUNISHMENT_TABLEOID_TO_SCHEMA[entry.tableoid];
                } else {
                    const [entry] = await Query.Context.BY_UUID.execute({ uuid: target });

                    if (!entry) {
                        replyError(interaction, 'There is no entry with the specified UUID.');
                        return;
                    }

                    if (!(await hasPermissionForTarget(interaction, entry.userId))) return;

                    uuid = target;
                    table = PUNISHMENT_TABLEOID_TO_SCHEMA[entry.tableoid];
                }

                const logString = await editContextURL(uuid, context, interaction.user.id, table);
                replySuccess(interaction, logString, 'Edit Context');
                break;
            }
        }
    } catch (error) {
        replyError(interaction, String(error));
    }
}
