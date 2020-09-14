import passport from 'passport';
import discordStrategy from 'passport-discord';
import { db } from '../../db/postgres.js';
import { client } from '../../bot/bot.js';

passport.serializeUser((user: any, done) => {
    done(undefined, user.user_id);
});

passport.deserializeUser(async (user_id, done) => {
    try {
        const user = (
            await db.query(
                /*sql*/ `
                SELECT "user_id"::TEXT, "username", "discriminator", "avatar", "role_ids"::TEXT[] 
                FROM "user" 
                WHERE user_id = $1 
                LIMIT 1`,
                [user_id]
            )
        ).rows[0];
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
            const { id, username, discriminator, avatar } = profile;

            const member = await client.guilds.cache.first()?.members.fetch(id);
            if (!member) return done(undefined, undefined, { error: 0 });

            const roles = member.roles.cache.keyArray().filter((role) => role !== member.guild.roles.everyone.id);
            if (roles.length === 0) return done(undefined, undefined, { error: 1 });

            try {
                const user = {
                    user_id: id,
                    username,
                    discriminator,
                    avatar,
                    role_ids: roles,
                };

                await db.query(
                    /*sql*/ `
                    INSERT INTO "user" (user_id, username, discriminator, avatar, role_ids) 
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (user_id) DO UPDATE
                    SET username = $2, discriminator = $3, avatar = $4, role_ids = $5`,
                    Object.values(user)
                );

                done(undefined, user);
            } catch (error) {
                console.log(error);
                done(error);
            }
        }
    )
);
