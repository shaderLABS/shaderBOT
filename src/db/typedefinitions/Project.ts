import { Snowflake } from 'discord.js';
import tgq from 'type-graphql';
import { Ticket } from './Ticket.js';
import { User } from './User.js';

@tgq.ObjectType()
export class Channel {
    @tgq.Field(() => String)
    name!: string;

    @tgq.Field(() => String, { nullable: true })
    topic!: string;
}

@tgq.ObjectType()
export class Project {
    // @tgq.Field(() => String)
    // id!: string;

    @tgq.Field(() => String)
    channel_id!: Snowflake;

    @tgq.Field(() => [String])
    owners!: Snowflake[];

    // @tgq.Authorized('P_ADMINISTRATOR')
    @tgq.Field(() => [User], { nullable: true })
    ownerUsers!: User[];

    @tgq.Field(() => Channel)
    channel!: Channel;

    @tgq.Field(() => [Ticket])
    tickets!: Ticket[];

    // @tgq.Field(() => String)
    // role_id!: string;
}
