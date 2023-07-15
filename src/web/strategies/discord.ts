import passport from 'passport';
import discordStrategy from 'passport-discord';
import { client } from '../../bot/bot.js';
import { getGuild } from '../../bot/lib/misc.js';

export namespace DiscordPassportStrategy {
    export type Info = undefined | { error: number };
}

passport.serializeUser<string>((user, done) => {
    // @ts-expect-error
    return done(undefined, user.id);
});

passport.deserializeUser(async (userID: string, done) => {
    const guild = getGuild();

    const user = await client.users.fetch(userID)?.catch(() => undefined);
    if (!user) return done(null);

    try {
        const data = {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            avatarURL: user.displayAvatarURL(),
            isBanned: !!(await guild.bans.fetch(user).catch(() => undefined)),
        };

        return done(undefined, data);
    } catch (error) {
        console.log(error);
        return done(error);
    }
});

passport.use(
    new discordStrategy(
        {
            clientID: process.env.APPLICATION_CLIENT_ID || '',
            clientSecret: process.env.APPLICATION_CLIENT_SECRET || '',
            callbackURL: process.env.NODE_ENV === 'production' ? `https://${process.env.DOMAIN || 'localhost'}/api/auth/redirect` : '/api/auth/redirect',
            scope: ['identify'],
        },

        async (_accessToken, _refreshToken, profile, done) => {
            const guild = getGuild();

            const user = await client.users.fetch(profile.id)?.catch(() => undefined);
            if (!user) return done(undefined, undefined, { error: 0 } as DiscordPassportStrategy.Info);

            try {
                const data = {
                    id: user.id,
                    username: user.username,
                    discriminator: user.discriminator,
                    avatarURL: user.displayAvatarURL(),
                    isBanned: !!(await guild.bans.fetch(user).catch(() => undefined)),
                };

                return done(undefined, data);
            } catch (error) {
                console.log(error);
                return done(error instanceof Error ? error : new Error('Login failed.'));
            }
        }
    )
);
