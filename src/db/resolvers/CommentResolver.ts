import tgq from 'type-graphql';
import { db } from '../postgres.js';
import { Comment } from '../typedefinitions/Comment.js';
import { fetchUser } from './UserResolver.js';

@tgq.Resolver(() => Comment)
export class CommentResolver {
    @tgq.FieldResolver({ name: 'author', nullable: true })
    async author(@tgq.Root() comment: Comment) {
        return await fetchUser(comment.author_id);
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
