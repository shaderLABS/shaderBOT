import passport from 'passport';
import discordStrategy from 'passport-discord';
import { getGuild } from '../../bot/lib/misc.js';

passport.serializeUser((user: any, done) => {
    done(undefined, user.id);
});

passport.deserializeUser(async (user_id: string, done) => {
    try {
        const member = await getGuild()
            ?.members.fetch(user_id)
            .catch(() => undefined);
        if (!member) return done(null);

        const roles = member.roles.cache.filter((role) => role.id !== member.guild.roles.everyone.id);

        const user = {
            id: member.id,
            username: member.user.username,
            discriminator: member.user.discriminator,
            avatarURL: member.user.displayAvatarURL(),
            roleColor: member.displayHexColor,
            permissions: member.permissions.bitfield,
            allRoles: roles.sort((first, second) => first.position - second.position).map(({ id, hexColor, name }) => ({ id, hexColor, name })),
        };

        return user ? done(undefined, user) : done(null);
    } catch (error) {
        console.log(error);
        done(error);
    }
});

passport.use(
    new discordStrategy(
        {
            clientID: process.env.APPLICATION_CLIENT_ID || '',
            clientSecret: process.env.APPLICATION_CLIENT_SECRET || '',
            callbackURL: '/api/auth/redirect',
            scope: ['identify'],
        },

        async (_accessToken, _refreshToken, profile, done) => {
            const member = await getGuild()
                ?.members.fetch(profile.id)
                .catch(() => undefined);
            if (!member) return done(undefined, undefined, { error: 0 });

            const roles = member.roles.cache.filter((role) => role.id !== member.guild.roles.everyone.id);

            try {
                const user = {
                    id: member.id,
                    username: member.user.username,
                    discriminator: member.user.discriminator,
                    avatarURL: member.user.displayAvatarURL(),
                    roleColor: member.displayHexColor,
                    permissions: member.permissions.bitfield,
                    allRoles: roles.map(({ id, hexColor, name }) => ({ id, hexColor, name })),
                };

                done(undefined, user);
            } catch (error) {
                console.log(error);
                done(error);
            }
        }
    )
);
