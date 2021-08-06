import { Snowflake } from 'discord.js';
import tgq from 'type-graphql';
import { User } from './User.js';

@tgq.ObjectType()
export class Comment {
    @tgq.Field(() => String)
    id!: string;

    @tgq.Field(() => String)
    ticket_id!: string;

    @tgq.Field(() => String)
    author_id!: Snowflake;

    @tgq.Field(() => User, { nullable: true })
    author!: User;

    @tgq.Field(() => String, { nullable: true })
    content!: string;

    @tgq.Field(() => [String], { nullable: true })
    attachments!: string[];

    @tgq.Field(() => String)
    message_id!: Snowflake;

    @tgq.Field(() => String)
    timestamp!: string;

    @tgq.Field(() => String, { nullable: true })
    edited!: string;
}
