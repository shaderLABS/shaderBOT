import { MessageEmbed, Permissions, TextChannel, Util } from 'discord.js';
import gq from 'graphql';
import tgq from 'type-graphql';
import log from '../../bot/lib/log.js';
import { getGuild, parseUser } from '../../bot/lib/misc.js';
import { formatTimeDate } from '../../bot/lib/time.js';
import { db } from '../postgres.js';
import { Comment } from '../typedefinitions/Comment.js';
import { fetchUser } from './UserResolver.js';

@tgq.Resolver(() => Comment)
export class CommentResolver {
    @tgq.FieldResolver({ name: 'author', nullable: true })
    async author(@tgq.Root() comment: Comment) {
        return await fetchUser(comment.author_id);
    }

    @tgq.Mutation(() => Comment, { nullable: true })
    async deleteComment(@tgq.Arg('id', () => String) id: string, @tgq.Ctx() ctx: any) {
        if (!ctx.req.user || !ctx.req.user.permissions) return new gq.GraphQLError('Unauthorized');
        const permissions = new Permissions(ctx.req.user.permission);
        const bypassAuthor = permissions.has('MANAGE_MESSAGES');

        const deleted = await db.query(
            /*sql*/ `
            DELETE FROM comment
            USING ticket
            WHERE comment.id = $1 AND ticket.id = comment.ticket_id ${bypassAuthor ? '' : 'AND comment.author_id = $2'}
            RETURNING comment.id, comment.author_id, comment.message_id, comment.content, ticket.channel_id`,
            bypassAuthor ? [id] : [id, ctx.req.user.id]
        );

        if (deleted.rowCount === 0) return new gq.GraphQLError('Unauthorized or no message was found');

        if (deleted.rows[0].message_id && deleted.rows[0].channel_id) {
            const commentChannel = getGuild()?.channels.cache.get(deleted.rows[0].channel_id);
            if (commentChannel && commentChannel instanceof TextChannel) {
                (await commentChannel.messages.fetch(deleted.rows[0].message_id)).delete();
            }
        }

        log(`${parseUser(ctx.req.user.id)} deleted a ticket comment by ${parseUser(deleted.rows[0].author_id)}:\n\n${deleted.rows[0].content}`);

        return deleted.rows[0];
    }

    @tgq.Mutation(() => Boolean)
    async createComment(@tgq.Arg('ticket_id', () => String) ticket_id: string, @tgq.Arg('content', () => String) content: string, @tgq.Ctx() ctx: any) {
        const user = ctx.req.user;
        if (!user) return new gq.GraphQLError('You must be logged in to send comments.');

        if (!content) return new gq.GraphQLError('The content may not be empty.');
        if (content.length > 2000) return new gq.GraphQLError('The content may not be over 2000 characters long.');

        const ticket = (
            await db.query(
                /*sql*/ `
                SELECT id, title, project_channel_id::TEXT, channel_id::TEXT, description, attachments, author_id::TEXT, timestamp::TEXT, edited::TEXT, closed
                FROM ticket
                WHERE id = $1 AND closed = FALSE
                LIMIT 1;`,
                [ticket_id]
            )
        ).rows[0];

        if (!ticket) return new gq.GraphQLError('The ticket does not exist or is closed.');

        const channel = getGuild()?.channels.cache.get(ticket.channel_id);
        if (!channel || !(channel instanceof TextChannel)) return new gq.GraphQLError('Ticket channel not found.');

        const timestamp = new Date();

        const commentEmbed = new MessageEmbed()
            .setColor(user.roleColor || '#212121')
            .setAuthor(Util.escapeMarkdown(user.username + '#' + user.discriminator), user.avatarURL || undefined)
            .setTimestamp(timestamp)
            .setDescription(content);

        const commentMessage = await channel.send(commentEmbed);

        await db.query(
            /*sql*/ `
            INSERT INTO comment (ticket_id, author_id, message_id, content, timestamp)
            VALUES ($1, $2, $3, $4, $5)`,
            [ticket_id, user.id, commentMessage.id, content, timestamp]
        );

        return true;
    }

    @tgq.Mutation(() => Boolean)
    async editComment(@tgq.Arg('comment_id', () => String) comment_id: string, @tgq.Arg('content', () => String) content: string, @tgq.Ctx() ctx: any) {
        const user = ctx.req.user;
        if (!user) return new gq.GraphQLError('You must be logged in to edit comments.');

        const comment = (
            await db.query(
                /*sql*/ `
            SELECT ticket.channel_id, comment.content, comment.timestamp, comment.message_id
            FROM comment
            INNER JOIN ticket ON ticket.id = comment.ticket_id
            WHERE comment.id = $1 AND comment.author_id = $2
            LIMIT 1;
        `,
                [comment_id, user.id]
            )
        ).rows[0];

        if (!comment) return new gq.GraphQLError('The comment does not exist or you have no permission to edit it.');

        const guild = getGuild();
        if (!guild) return new gq.GraphQLError('No guild found.');

        const editedAt = new Date();

        const channel = guild.channels.cache.get(comment.channel_id);
        if (channel && channel instanceof TextChannel) {
            const originalMessage = await channel.messages.fetch(comment.message_id);
            if (originalMessage) {
                const embed = originalMessage.embeds[0];
                if (embed) {
                    embed.setFooter(`edited at ${formatTimeDate(editedAt)}`);
                    embed.setDescription(content);

                    await originalMessage.edit(embed);
                }
            }
        }

        await db.query(
            /*sql*/ `
            UPDATE comment
            SET content = $1, edited = $2
            WHERE id = $3`,
            [content, editedAt, comment_id]
        );

        log(`${parseUser(user.id)} edited their ticket comment from:\n\n${comment.content}\n\nto:\n\n${content}`);
        return true;
    }
}
