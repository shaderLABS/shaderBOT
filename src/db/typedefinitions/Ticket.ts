import tgq from 'type-graphql';
import { Comment } from './Comment.js';
import { Project } from './Project.js';
import { User } from './User.js';

@tgq.ObjectType()
export class Ticket {
    @tgq.Field(() => String)
    id!: string;

    @tgq.Field(() => String)
    title!: string;

    @tgq.Field(() => String)
    project_channel_id!: string;

    @tgq.Field(() => Project)
    project!: Project;

    @tgq.Field(() => String, { nullable: true })
    channel_id!: string;

    @tgq.Field(() => String, { nullable: true })
    description!: string;

    @tgq.Field(() => [String], { nullable: true })
    attachments!: string[];

    @tgq.Field(() => String)
    author_id!: string;

    @tgq.Field(() => User, { nullable: true })
    author!: User;

    @tgq.Field(() => String)
    timestamp!: string;

    @tgq.Field(() => String, { nullable: true })
    edited!: string;

    @tgq.Field(() => Boolean)
    closed!: boolean;

    @tgq.Field(() => [Comment])
    comments!: Comment[];
}
