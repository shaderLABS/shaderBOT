import tgq from 'type-graphql';
import { getGuild } from '../../bot/lib/misc.js';
import { Channel } from '../typedefinitions/Project.js';
import { Role } from '../typedefinitions/User.js';

@tgq.Resolver(() => Channel)
export class ChannelResolver {
    @tgq.Query(() => Channel)
    channel(@tgq.Arg('id', () => String) id: string) {
        return getGuild()?.channels.cache.get(id);
    }
}

@tgq.Resolver(() => Role)
export class RoleResolver {
    @tgq.Query(() => Role)
    async role(@tgq.Arg('id', () => String) id: string) {
        return await getGuild()?.roles.fetch(id);
    }
}
