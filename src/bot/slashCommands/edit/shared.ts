import { Guild, MessageEmbed, User } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { GuildCommandInteraction } from '../../events/interactionCreate.js';
import { editBanDuration, editBanReason } from '../../lib/edit/editBan.js';
import { editContext } from '../../lib/edit/editContext.js';
import { editKick } from '../../lib/edit/editKick.js';
import { editMuteDuration, editMuteReason } from '../../lib/edit/editMute.js';
import { editNote } from '../../lib/edit/editNote.js';
import { editWarnReason, editWarnSeverity } from '../../lib/edit/editWarning.js';
import { embedIcon, replyError, replySuccess } from '../../lib/embeds.js';
import { isTextOrThreadChannel, parseUser } from '../../lib/misc.js';
import { formatTimeDate, secondsToString, splitString, stringToSeconds } from '../../lib/time.js';

function requireTime(value: string) {
    const time = stringToSeconds(splitString(value));

    if (isNaN(time)) throw 'The specified time exceeds the range of UNIX time.';
    if (time < 10) throw 'The specified time must be greater than 10 seconds.';

    return time;
}

function requireReason(value: string) {
    if (value.length > 500) throw 'The reason must not be more than 500 characters long.';
    return value;
}

function requireContent(value: string) {
    if (value.length < 1 || value.length > 500) throw 'The content must be between 1 and 500 characters long.';
    return value;
}

async function requireContext(value: string, guild: Guild) {
    const IDs = value.split('/');
    const messageID = IDs.pop();
    const channelID = IDs.pop();

    if (!messageID || !channelID) return Promise.reject('The specified message URL is invalid.');
    const channel = guild.channels.cache.get(channelID);
    if (!channel || !isTextOrThreadChannel(channel)) return Promise.reject('The specified message URL points to an invalid channel.');
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
                const time = requireTime(value);

                const uuid: string | undefined =
                    target instanceof User
                        ? (await db.query(/*sql*/ `SELECT id FROM punishment WHERE "type" = 'ban' AND user_id = $1 ORDER BY timestamp DESC LIMIT 1`, [target.id])).rows[0]?.id
                        : target;

                if (!uuid) return replyError(interaction, 'The specified user does not have any active bans.');

                const { user_id, expire_timestamp } = await editBanDuration(uuid, time, interaction.user.id);
                replySuccess(
                    interaction,
                    `Successfully edited the duration of ${parseUser(user_id)}'s ban (${uuid}) to ${secondsToString(time)}. They will be unbanned at ${formatTimeDate(new Date(expire_timestamp))}.`,
                    'Edit Ban Duration'
                );
                break;
            }

            case 'banreason': {
                const reason = requireReason(value);

                let uuid: string;
                let isPastPunishment: boolean;
                if (target instanceof User) {
                    const latestEntry = (
                        await db.query(
                            /*sql*/ `
                            WITH entries AS (
                                (SELECT id, timestamp, 'p' AS db FROM punishment WHERE "type" = 'ban' AND user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                                UNION
                                (SELECT id, timestamp, 'pp' AS db FROM past_punishment WHERE "type" = 'ban' AND user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                            )
                            SELECT id, db FROM entries ORDER BY timestamp DESC LIMIT 1;`,
                            [target.id]
                        )
                    ).rows[0];
                    if (!latestEntry) return replyError(interaction, 'The specified user does not have any bans.');

                    uuid = latestEntry.id;
                    isPastPunishment = latestEntry.db === 'pp';
                } else {
                    uuid = target;
                    isPastPunishment = !!(await db.query(/*sql*/ `SELECT 1 FROM past_punishment WHERE id = $1;`, [uuid])).rows[0];
                }

                const { user_id } = await editBanReason(uuid, reason, interaction.user.id, isPastPunishment);
                replySuccess(interaction, `Successfully edited the reason of ${parseUser(user_id)}'s ban (${uuid}).`, 'Edit Ban Reason');
                break;
            }

            case 'kickreason': {
                const reason = requireReason(value);

                const uuid: string | undefined =
                    target instanceof User
                        ? (await db.query(/*sql*/ `SELECT id FROM past_punishment WHERE "type" = 'kick' AND user_id = $1 ORDER BY timestamp DESC LIMIT 1`, [target.id])).rows[0]?.id
                        : target;

                if (!uuid) return replyError(interaction, 'The specified user does not have any kicks.');

                const { user_id } = await editKick(uuid, reason, interaction.user.id);
                replySuccess(interaction, `Successfully edited the reason of ${parseUser(user_id)}'s kick (${uuid}).`, 'Edit Kick Reason');
                break;
            }

            case 'muteduration': {
                const time = requireTime(value);

                const uuid: string | undefined =
                    target instanceof User
                        ? (await db.query(/*sql*/ `SELECT id FROM punishment WHERE "type" = 'mute' AND user_id = $1 ORDER BY timestamp DESC LIMIT 1`, [target.id])).rows[0]?.id
                        : target;

                if (!uuid) return replyError(interaction, 'The specified user does not have any active mutes.');

                const { user_id, expire_timestamp } = await editMuteDuration(uuid, time, interaction.user.id);
                replySuccess(
                    interaction,
                    `Successfully edited the duration of ${parseUser(user_id)}'s mute (${uuid}) to ${secondsToString(time)}. They will be unmuted at ${formatTimeDate(new Date(expire_timestamp))}.`,
                    'Edit Mute Duration'
                );
                break;
            }

            case 'mutereason': {
                const reason = requireReason(value);

                let uuid: string;
                let isPastPunishment: boolean;
                if (target instanceof User) {
                    const latestEntry = (
                        await db.query(
                            /*sql*/ `
                            WITH entries AS (
                                (SELECT id, timestamp, 'p' AS db FROM punishment WHERE "type" = 'mute' AND user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                                UNION
                                (SELECT id, timestamp, 'pp' AS db FROM past_punishment WHERE "type" = 'mute' AND user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                            )
                            SELECT id, db FROM entries ORDER BY timestamp DESC LIMIT 1;`,
                            [target.id]
                        )
                    ).rows[0];
                    if (!latestEntry) return replyError(interaction, 'The specified user does not have any mutes.');

                    uuid = latestEntry.id;
                    isPastPunishment = latestEntry.db === 'pp';
                } else {
                    uuid = target;
                    isPastPunishment = !!(await db.query(/*sql*/ `SELECT 1 FROM past_punishment WHERE id = $1;`, [uuid])).rows[0];
                }

                const { user_id } = await editMuteReason(uuid, reason, interaction.user.id, isPastPunishment);
                replySuccess(interaction, `Successfully edited the reason of ${parseUser(user_id)}'s mute (${uuid}).`, 'Edit Mute Reason');
                break;
            }

            case 'note': {
                const content = requireContent(value);

                const uuid: string | undefined =
                    target instanceof User ? (await db.query(/*sql*/ `SELECT id FROM note WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1`, [target.id])).rows[0]?.id : target;

                if (!uuid) return replyError(interaction, 'The specified user does not have any notes.');

                const { user_id } = await editNote(uuid, content, interaction.user.id);
                interaction.reply({
                    embeds: [
                        new MessageEmbed()
                            .setAuthor({ name: 'Edited Note', iconURL: embedIcon.note })
                            .setColor('#ffc107')
                            .setDescription(`Successfully edited the content of ${parseUser(user_id)}'s note.`)
                            .setFooter('ID: ' + uuid),
                    ],
                });
                break;
            }

            case 'warnreason': {
                const reason = requireReason(value);

                const uuid: string | undefined =
                    target instanceof User ? (await db.query(/*sql*/ `SELECT id FROM warn WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1`, [target.id])).rows[0]?.id : target;

                if (!uuid) return replyError(interaction, 'The specified user does not have any warnings.');

                const { user_id } = await editWarnReason(reason, uuid, interaction.user.id);
                replySuccess(interaction, `Successfully edited the reason of ${parseUser(user_id)}'s warning (${uuid}).`, 'Edit Warning Reason');
                break;
            }

            case 'warnseverity': {
                const severity = Number.parseInt(value);
                if (severity < 0 || severity > 3) throw 'The severity must be an integer between 0 and 3.';

                const uuid: string | undefined =
                    target instanceof User ? (await db.query(/*sql*/ `SELECT id FROM warn WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1`, [target.id])).rows[0]?.id : target;

                if (!uuid) return replyError(interaction, 'The specified user does not have any warnings.');

                const user_id = await editWarnSeverity(severity, uuid, interaction.user.id);
                replySuccess(interaction, `Successfully edited the severity of ${parseUser(user_id)}'s warning (${uuid}).`, 'Edit Warning Severity');
                break;
            }

            case 'context': {
                const context = await requireContext(value, interaction.guild);

                let uuid: string;
                let table: 'warn' | 'punishment' | 'past_punishment' | 'note';
                if (target instanceof User) {
                    const latestEntry = (
                        await db.query(
                            /*sql*/ `
                            WITH entries AS (
                                (SELECT id, timestamp, 'punishment' AS db FROM punishment WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                                UNION
                                (SELECT id, timestamp, 'past_punishment' AS db FROM past_punishment WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                                UNION
                                (SELECT id, timestamp, 'note' AS db FROM note WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                                UNION
                                (SELECT id, timestamp, 'warn' AS db FROM warn WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                            )
                            SELECT id, db FROM entries ORDER BY timestamp DESC LIMIT 1;`,
                            [target.id]
                        )
                    ).rows[0];
                    if (!latestEntry) return replyError(interaction, 'The specified user does not have any entries.');

                    uuid = latestEntry.id;
                    table = latestEntry.db;
                } else {
                    uuid = target;
                    table = (
                        await db.query(
                            /*sql*/ `
                            (SELECT 'punishment' AS db FROM punishment WHERE id = $1)
                            UNION
                            (SELECT 'past_punishment' AS db FROM past_punishment WHERE id = $1)
                            UNION
                            (SELECT 'note' AS db FROM note WHERE id = $1)
                            UNION
                            (SELECT 'warn' AS db FROM warn WHERE id = $1)`,
                            [uuid]
                        )
                    ).rows[0].db;

                    if (!table) return replyError(interaction, 'There is no entry with the specified UUID.');
                }

                const { user_id, tableString } = await editContext(uuid, context, interaction.user.id, table);
                replySuccess(interaction, `Successfully edited the context of ${parseUser(user_id)}'s ${tableString} (${uuid}).`, 'Edit Context');
                break;
            }
        }
    } catch (error) {
        replyError(interaction, error);
    }
}
