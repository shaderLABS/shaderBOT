import passport from 'passport';
import discordStrategy from 'passport-discord';
import { db } from '../../db/postgres.js';

passport.serializeUser((user: any, done) => {
    done(undefined, user.user_id);
});

passport.deserializeUser(async (user_id, done) => {
    try {
        const user = (await db.query(/*sql*/ `SELECT * FROM "user" WHERE user_id = $1 LIMIT 1`, [user_id])).rows[0];
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
            scope: ['identify', 'guilds'],
        },
        async (accessToken, refreshToken, profile, done) => {
            const { id, username, discriminator, avatar, guilds } = profile;
            if (!guilds) return done(new Error("The user isn't in any guilds."));

            try {
                const user = await db.query(
                    /*sql*/ `
                    INSERT INTO "user" (user_id, username, discriminator, avatar, guild_ids) 
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (user_id) DO UPDATE
                    SET username = $2, discriminator = $3, avatar = $4, guild_ids = $5
                    RETURNING user_id, username, discriminator, avatar, guild_ids`,
                    [id, username, discriminator, avatar, guilds.map((guild) => guild.id)]
                );
                done(undefined, user.rows[0]);
            } catch (error) {
                console.log(error);
                done(error);
            }
        }
    )
);
