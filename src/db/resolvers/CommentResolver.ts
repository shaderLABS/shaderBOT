import { Permissions, TextChannel } from 'discord.js';
import tgq from 'type-graphql';
import gq from 'graphql';
import { client } from '../../bot/bot.js';
import { db } from '../postgres.js';
import { Comment } from '../typedefinitions/Comment.js';
import { fetchUser } from './UserResolver.js';
import log from '../../bot/lib/log.js';

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
            const commentChannel = client.guilds.cache.first()?.channels.cache.get(deleted.rows[0].channel_id);
            if (commentChannel && commentChannel instanceof TextChannel) {
                (await commentChannel.messages.fetch(deleted.rows[0].message_id)).delete();
            }
        }

        log(`<@${ctx.req.user.id}> deleted ticket comment by <@${deleted.rows[0].author_id}>:\n\n${deleted.rows[0].content}`);

        return deleted.rows[0];
    }

    // @tgq.FieldResolver({ name: 'ticket', nullable: true })
    // async ticket(@tgq.Root() comment: Comment) {
    //     return (
    //         await db.query(
    //             /*sql*/ `
    //             SELECT id, title, project_channel_id::TEXT, description, attachments, author_id::TEXT, timestamp::TEXT, edited::TEXT, closed
    //             FROM ticket
    //             WHERE id = $1
    //             LIMIT 1`,
    //             [comment.ticket_id]
    //         )
    //     ).rows[0];
    // }
}
