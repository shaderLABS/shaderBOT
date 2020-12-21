import { Message } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { formatTimeDate } from '../misc.js';

export async function editComment(commentID: string, message: Message, newContent: string) {
    const embed = message.embeds[0];
    if (!embed) return;

    const editedAt = new Date();

    embed.setFooter(`edited at ${formatTimeDate(editedAt)}`);
    embed.setDescription(newContent);

    await message.edit(embed);

    db.query(
        /*sql*/ `
        UPDATE comment 
        SET content = $1, edited = $2 
        WHERE id = $3`,
        [newContent, editedAt, commentID]
    );
}
