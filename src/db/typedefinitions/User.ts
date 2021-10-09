import { Snowflake } from 'discord.js';
import tgq from 'type-graphql';
import { Project } from './Project.js';

@tgq.ObjectType()
export class Warning {
    @tgq.Field(() => tgq.Int)
    severity!: number;
}

@tgq.ObjectType()
export class Role {
    @tgq.Field(() => String)
    id!: Snowflake;

    @tgq.Field(() => String)
    hexColor!: string;

    @tgq.Field(() => String)
    name!: string;

    // @tgq.Field(() => tgq.Int)
    // position!: number;
}

@tgq.ObjectType()
export class User {
    @tgq.Field(() => String)
    id!: Snowflake;

    // @tgq.Field(() => String)
    // user_id!: string;

    @tgq.Field(() => String)
    username!: string;

    @tgq.Field(() => tgq.Int)
    discriminator!: string;

    @tgq.Field(() => String, { nullable: true })
    avatarURL!: string[];

    @tgq.Field(() => Number, { nullable: true })
    permissions!: Number;

    @tgq.Field(() => [Role], { nullable: true })
    allRoles!: Role[];

    @tgq.Field(() => String, { nullable: true })
    roleColor!: String;

    @tgq.Field(() => [Project], { nullable: true })
    projects!: Project[];

    @tgq.Field(() => [Warning], { nullable: true })
    warnings!: Warning[];
}
