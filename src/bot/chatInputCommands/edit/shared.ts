import { User } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { client } from '../../bot.js';
import { GuildChatInputCommandInteraction } from '../../chatInputCommandHandler.js';
import { PunishmentTable, editContextURL } from '../../lib/context.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { Note } from '../../lib/note.js';
import { Ban, LiftedBan } from '../../lib/punishment/ban.js';
import { Kick } from '../../lib/punishment/kick.js';
import { LiftedMute, Mute } from '../../lib/punishment/mute.js';
import { hasPermissionForTarget } from '../../lib/searchMessage.js';
import { splitString, stringToSeconds } from '../../lib/time.js';
import { Warning } from '../../lib/warning.js';

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
                if (!(await hasPermissionForTarget(interaction, ban.userID))) return;
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

                if (!(await hasPermissionForTarget(interaction, ban.userID))) return;
                const logString = await ban.editReason(value, interaction.user.id);

                replySuccess(interaction, logString, 'Edit Ban Reason');
                break;
            }

            case 'kickreason': {
                const kick = target instanceof User ? await Kick.getLatestByUserID(target.id) : await Kick.getByUUID(target);
                if (!(await hasPermissionForTarget(interaction, kick.userID))) return;
                const logString = await kick.editReason(value, interaction.user.id);

                replySuccess(interaction, logString, 'Edit Kick Reason');
                break;
            }

            case 'muteduration': {
                const time = stringToSeconds(splitString(value));

                const mute = target instanceof User ? await Mute.getByUserID(target.id) : await Mute.getByUUID(target);
                if (!(await hasPermissionForTarget(interaction, mute.userID, 'moderatable'))) return;
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

                if (!(await hasPermissionForTarget(interaction, mute.userID))) return;
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
                if (!(await hasPermissionForTarget(interaction, warning.userID))) return;

                const logString = await warning.editReason(value, interaction.user.id);
                replySuccess(interaction, logString, 'Edit Warning Reason');
                break;
            }

            case 'warnseverity': {
                const warning = target instanceof User ? await Warning.getLatestByUserID(target.id) : await Warning.getByUUID(target);
                if (!(await hasPermissionForTarget(interaction, warning.userID))) return;

                const logString = await warning.editSeverity(Number.parseInt(value), interaction.user.id);
                replySuccess(interaction, logString, 'Edit Warning Severity');
                break;
            }

            case 'context': {
                const context = await requireContext(value);

                let uuid: string;
                let table: PunishmentTable;

                if (target instanceof User) {
                    const entry = (
                        await db.query({
                            text: /*sql*/ `
                                WITH entries AS (
                                    (SELECT id, timestamp, tableoid::regclass FROM ban WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                                    UNION ALL
                                    (SELECT id, timestamp, tableoid::regclass FROM mute WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                                    UNION ALL
                                    (SELECT id, timestamp, tableoid::regclass FROM kick WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                                    UNION ALL
                                    (SELECT id, timestamp, tableoid::regclass FROM lifted_ban WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                                    UNION ALL
                                    (SELECT id, timestamp, tableoid::regclass FROM lifted_mute WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                                    UNION ALL
                                    (SELECT id, timestamp, tableoid::regclass FROM note WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                                    UNION ALL
                                    (SELECT id, timestamp, tableoid::regclass FROM warn WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                                )
                                SELECT id, tableoid FROM entries ORDER BY timestamp DESC LIMIT 1;`,
                            values: [target.id],
                            name: 'context-latest-user-id',
                        })
                    ).rows[0];

                    if (!entry) {
                        replyError(interaction, 'The specified user does not have any entries.');
                        return;
                    }

                    if (!(await hasPermissionForTarget(interaction, target))) return;

                    uuid = entry.id;
                    table = entry.tableoid;
                } else {
                    const entry = (
                        await db.query({
                            text: /*sql*/ `
                                (SELECT user_id, tableoid::regclass FROM ban WHERE id = $1)
                                UNION ALL
                                (SELECT user_id, tableoid::regclass FROM mute WHERE id = $1)
                                UNION ALL
                                (SELECT user_id, tableoid::regclass FROM kick WHERE id = $1)
                                UNION ALL
                                (SELECT user_id, tableoid::regclass FROM lifted_ban WHERE id = $1)
                                UNION ALL
                                (SELECT user_id, tableoid::regclass FROM lifted_mute WHERE id = $1)
                                UNION ALL
                                (SELECT user_id, tableoid::regclass FROM note WHERE id = $1)
                                UNION ALL
                                (SELECT user_id, tableoid::regclass FROM warn WHERE id = $1)`,
                            values: [target],
                            name: 'context-uuid',
                        })
                    ).rows[0];

                    if (!entry) {
                        replyError(interaction, 'There is no entry with the specified UUID.');
                        return;
                    }

                    if (!(await hasPermissionForTarget(interaction, entry.user_id))) return;

                    uuid = target;
                    table = entry.tableoid;
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
