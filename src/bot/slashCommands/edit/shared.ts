import { Guild, User } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { BanAppeal } from '../../lib/banAppeal.js';
import { editContextURL } from '../../lib/context.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { Note } from '../../lib/note.js';
import { PastPunishment, Punishment } from '../../lib/punishment.js';
import { hasPermissionForTarget } from '../../lib/searchMessage.js';
import { splitString, stringToSeconds } from '../../lib/time.js';
import { Warning } from '../../lib/warning.js';
import { GuildCommandInteraction } from '../../slashCommandHandler.js';

async function requireContext(value: string, guild: Guild) {
    const IDs = value.split('/');
    const messageID = IDs.pop();
    const channelID = IDs.pop();

    if (!messageID || !channelID) return Promise.reject('The specified message URL is invalid.');

    const channel = guild.channels.cache.get(channelID);
    if (!channel?.isTextBased()) return Promise.reject('The specified message URL points to an invalid channel.');

    const message = await channel.messages.fetch(messageID);
    if (!message) return Promise.reject('The specified message URL points to an invalid message.');

    return message.url;
}

export async function editApsect(interaction: GuildCommandInteraction, target: string | User) {
    const aspect = interaction.options.getString('aspect', true);
    const value = interaction.options.getString('value', true);

    try {
        switch (aspect) {
            case 'banduration': {
                const time = stringToSeconds(splitString(value));

                const ban = target instanceof User ? await Punishment.getByUserID(target.id, 'ban') : await Punishment.getByUUID(target, 'ban');
                if (!(await hasPermissionForTarget(interaction, ban.userID))) return;
                const logString = await ban.editDuration(time, interaction.user.id);

                replySuccess(interaction, logString, 'Edit Ban Duration');
                break;
            }

            case 'banreason': {
                let ban: Punishment | PastPunishment | undefined;
                if (target instanceof User) {
                    ban = await Punishment.getByUserID(target.id, 'ban').catch(() => undefined);
                    ban ??= await PastPunishment.getLatestByUserID(target.id, 'ban').catch(() => undefined);

                    if (!ban) return replyError(interaction, 'The specified user does not have any bans.');
                } else {
                    ban = await Punishment.getByUUID(target, 'ban').catch(() => undefined);
                    ban ??= await PastPunishment.getByUUID(target, 'ban').catch(() => undefined);

                    if (!ban) return replyError(interaction, 'A ban with the specified UUID does not exist.');
                }

                if (!(await hasPermissionForTarget(interaction, ban.userID))) return;
                const logString = await ban.editReason(value, interaction.user.id);

                replySuccess(interaction, logString, 'Edit Ban Reason');
                break;
            }

            case 'kickreason': {
                const kick = target instanceof User ? await PastPunishment.getLatestByUserID(target.id, 'kick') : await PastPunishment.getByUUID(target, 'kick');
                if (!(await hasPermissionForTarget(interaction, kick.userID))) return;
                const logString = await kick.editReason(value, interaction.user.id);

                replySuccess(interaction, logString, 'Edit Kick Reason');
                break;
            }

            case 'muteduration': {
                const time = stringToSeconds(splitString(value));

                const mute = target instanceof User ? await Punishment.getByUserID(target.id, 'mute') : await Punishment.getByUUID(target, 'mute');
                if (!(await hasPermissionForTarget(interaction, mute.userID, 'moderatable'))) return;
                const logString = await mute.editDuration(time, interaction.user.id);

                replySuccess(interaction, logString, 'Edit Mute Duration');
                break;
            }

            case 'mutereason': {
                let mute: Punishment | PastPunishment | undefined;
                if (target instanceof User) {
                    mute = await Punishment.getByUserID(target.id, 'mute').catch(() => undefined);
                    mute ??= await PastPunishment.getLatestByUserID(target.id, 'mute').catch(() => undefined);

                    if (!mute) return replyError(interaction, 'The specified user does not have any mutes.');
                } else {
                    mute = await Punishment.getByUUID(target, 'mute').catch(() => undefined);
                    mute ??= await PastPunishment.getByUUID(target, 'mute').catch(() => undefined);

                    if (!mute) return replyError(interaction, 'A mute with the specified UUID does not exist.');
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

            case 'appealreason': {
                const appeal = target instanceof User ? await BanAppeal.getLatestByUserID(target.id) : await BanAppeal.getByUUID(target);
                if (!(await hasPermissionForTarget(interaction, appeal.userID))) return;

                const logString = await appeal.editResultReason(value, interaction.user.id);
                replySuccess(interaction, logString, 'Edit Ban Appeal Result Reason');
                break;
            }

            case 'context': {
                const context = await requireContext(value, interaction.guild);

                let uuid: string;
                let table: 'warn' | 'punishment' | 'past_punishment' | 'note';
                if (target instanceof User) {
                    const entry = (
                        await db.query(
                            /*sql*/ `
                            WITH entries AS (
                                (SELECT id, timestamp, 'punishment' AS table_name FROM punishment WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                                UNION ALL
                                (SELECT id, timestamp, 'past_punishment' AS table_name FROM past_punishment WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                                UNION ALL
                                (SELECT id, timestamp, 'note' AS table_name FROM note WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                                UNION ALL
                                (SELECT id, timestamp, 'warn' AS table_name FROM warn WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                            )
                            SELECT id, table_name FROM entries ORDER BY timestamp DESC LIMIT 1;`,
                            [target.id]
                        )
                    ).rows[0];

                    if (!entry) return replyError(interaction, 'The specified user does not have any entries.');
                    if (!(await hasPermissionForTarget(interaction, target))) return;

                    uuid = entry.id;
                    table = entry.table_name;
                } else {
                    const entry = (
                        await db.query(
                            /*sql*/ `
                            (SELECT user_id, 'punishment' AS table_name FROM punishment WHERE id = $1)
                            UNION ALL
                            (SELECT user_id, 'past_punishment' AS table_name FROM past_punishment WHERE id = $1)
                            UNION ALL
                            (SELECT user_id, 'note' AS table_name FROM note WHERE id = $1)
                            UNION ALL
                            (SELECT user_id, 'warn' AS table_name FROM warn WHERE id = $1)`,
                            [target]
                        )
                    ).rows[0];

                    if (!entry) return replyError(interaction, 'There is no entry with the specified UUID.');
                    if (!(await hasPermissionForTarget(interaction, entry.user_id))) return;

                    uuid = target;
                    table = entry.table_name;
                }

                const logString = await editContextURL(uuid, context, interaction.user.id, table);
                replySuccess(interaction, logString, 'Edit Context');
                break;
            }
        }
    } catch (error) {
        replyError(interaction, error);
    }
}
