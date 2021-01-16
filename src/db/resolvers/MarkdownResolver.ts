import gq from 'graphql';
import tgq from 'type-graphql';
import { getGuild } from '../../bot/lib/misc.js';
import { Channel } from '../typedefinitions/Project.js';
import { Role } from '../typedefinitions/User.js';

@tgq.Resolver(() => Channel)
export class ChannelResolver {
    @tgq.Query(() => Channel)
    channel(@tgq.Arg('id', () => String) id: string) {
        const channel = getGuild()?.channels.cache.get(id);
        if (!channel) return new gq.GraphQLError('Channel not found');
        return channel;
    }
}

@tgq.Resolver(() => Role)
export class RoleResolver {
    @tgq.Query(() => Role)
    async role(@tgq.Arg('id', () => String) id: string) {
        const role = await getGuild()?.roles.fetch(id);
        if (!role?.mentionable) return new gq.GraphQLError('Mentionable role not found.');
        return role;
    }
}
