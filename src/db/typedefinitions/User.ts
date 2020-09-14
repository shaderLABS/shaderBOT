import tgq from 'type-graphql';
import { Project } from './Project.js';
import { Ticket } from './Ticket.js';

@tgq.ObjectType()
export class User {
    @tgq.Field(() => String)
    id!: string;

    // @tgq.Field(() => String)
    // user_id!: string;

    @tgq.Field(() => String)
    username!: string;

    @tgq.Field(() => tgq.Int)
    discriminator!: string;

    @tgq.Field(() => String, { nullable: true })
    avatar!: string[];

    @tgq.Field(() => [Ticket], { nullable: true })
    tickets!: Ticket[];

    @tgq.Field(() => [Project], { nullable: true })
    projects!: Project[];
}
