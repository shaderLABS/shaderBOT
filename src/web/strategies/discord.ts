import passport from 'passport';
import discordStrategy from 'passport-discord';
// import { db } from '../../db/postgres.js';
import { client } from '../../bot/bot.js';

passport.serializeUser((user: any, done) => {
    done(undefined, user.id);
});

passport.deserializeUser(async (user_id: string, done) => {
    try {
        const member = await client.guilds.cache
            .first()
            ?.members.fetch(user_id)
            .catch(() => undefined);
        if (!member) return done(null);

        const roles = member.roles.cache.filter((role) => role.id !== member.guild.roles.everyone.id);
        if (roles.size === 0) return done(null);

        const user = {
            id: member.id,
            username: member.user.username,
            discriminator: member.user.discriminator,
            avatarURL: member.user.displayAvatarURL(),
            roleColor: member.displayHexColor,
            permissions: member.permissions.bitfield,
            allRoles: roles.map(({ id, hexColor, name }) => ({ id, hexColor, name })),
            // role_ids: roles,
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
            const member = await client.guilds.cache
                .first()
                ?.members.fetch(profile.id)
                .catch(() => undefined);
            if (!member) return done(undefined, undefined, { error: 0 });

            const roles = member.roles.cache.filter((role) => role.id !== member.guild.roles.everyone.id);
            if (roles.size === 0) return done(undefined, undefined, { error: 1 });

            try {
                const user = {
                    id: member.id,
                    username: member.user.username,
                    discriminator: member.user.discriminator,
                    avatarURL: member.user.displayAvatarURL(),
                    roleColor: member.displayHexColor,
                    permissions: member.permissions.bitfield,
                    allRoles: roles.map(({ id, hexColor, name }) => ({ id, hexColor, name })),
                    // role_ids: roles,
                };

                done(undefined, user);
            } catch (error) {
                console.log(error);
                done(error);
            }
        }
    )
);
