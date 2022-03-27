import bodyParser from 'body-parser';
import store from 'connect-pg-simple';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import polka from 'polka';
import { createBanAppeal, getBanInformation } from '../bot/lib/banAppeal.js';
import { db } from '../db/postgres.js';
import './strategies/discord.js';
import { releaseNotification, verifySignature } from './webhook.js';

const PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3001;

const app = polka();

export function startWebserver() {
    if (process.env.BOT_ONLY === 'true') return;

    /**************
     * MIDDLEWARE *
     **************/

    const pg_store = store(session);

    app.use(
        cors({
            origin: PRODUCTION ? [] : ['http://localhost:3000'],
            credentials: true,
        })
    );

    app.use(
        bodyParser.json({
            verify: (req, _, buffer) => {
                // @ts-ignore
                req.rawBody = buffer;
            },
        })
    );

    if (!process.env.SESSION_SECRET) throw "The 'SESSION_SECRET' environment variable is required.";

    app.use(
        session({
            secret: process.env.SESSION_SECRET,
            cookie: { maxAge: 86400000 }, // 1 day
            resave: false,
            saveUninitialized: false,
            store: new pg_store({ pool: db }),
        })
    );

    app.use(passport.initialize());
    app.use(passport.session());

    /**********
     * ROUTES *
     **********/

    app.get('/api/auth/login', passport.authenticate('discord'));

    app.get('/api/auth/redirect', (req, res, next) => {
        passport.authenticate('discord', (_, user, info) => {
            if (info?.error) {
                res.setHeader('Location', '/?error=' + info.error);
                res.statusCode = 302;
                return res.end();
            }

            if (!user) {
                res.setHeader('Location', '/?error=1');
                res.statusCode = 302;
                return res.end();
            }

            req.logIn(user, (err) => {
                res.setHeader('Location', err ? '/?error=2' : '/');
                res.statusCode = 302;
                return res.end();
            });
        })(req, res, next);
    });

    app.post('/api/auth/logout', (req, res) => {
        if (req.isUnauthenticated()) {
            res.statusCode = 401;
            return res.end('Unauthorized');
        }

        if (req.session) {
            req.session.destroy(() => {
                // clear session cookie
                res.setHeader('Set-Cookie', `connect.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT`);

                res.statusCode = 200;
                return res.end('OK');
            });
        } else {
            res.statusCode = 400;
            return res.end('Bad Request');
        }
    });

    app.get('/api/user/me', (req, res) => {
        // 200 OK - user is logged in, data in response
        // 204 No Content - user not logged in, no data available

        if (req.isUnauthenticated()) {
            res.statusCode = 204;
            return res.end('No Content');
        }

        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        return res.end(JSON.stringify(req.user));
    });

    app.get('/api/ban/me', async (req, res) => {
        if (req.isUnauthenticated()) {
            res.statusCode = 401;
            return res.end('Unauthorized');
        }

        // @ts-ignore
        const userID = req.user?.id;

        try {
            const ban = await getBanInformation(userID);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            return res.end(JSON.stringify(ban));
        } catch (error) {
            res.statusCode = 400;
            return res.end('Bad Request');
        }
    });

    app.post('/api/appeal', async (req, res) => {
        if (req.isUnauthenticated()) {
            res.statusCode = 401;
            return res.end('Unauthorized');
        }

        // @ts-ignore
        const { id, username, discriminator, avatarURL } = req.user;
        const reason = req.body?.reason;

        try {
            await createBanAppeal(id, username, discriminator, avatarURL, reason);
        } catch {
            res.statusCode = 400;
            return res.end('Bad Request');
        }

        res.statusCode = 200;
        return res.end('OK');
    });

    app.post('/api/webhook/release/:id', async (req, res) => {
        const channelID = req.params.id;
        if (/\D/.test(channelID)) {
            res.statusCode = 400;
            return res.end();
        }

        const signature = req.headers['x-hub-signature-256'];
        if (!signature || Array.isArray(signature)) {
            res.statusCode = 400;
            return res.end();
        }

        const project = (await db.query(/*sql*/ `SELECT role_id, encode(webhook_secret, 'hex') AS webhook_secret FROM project WHERE channel_id = $1;`, [channelID])).rows[0];
        if (!project || !project.webhook_secret || !project.role_id) {
            res.statusCode = 404;
            return res.end();
        }

        // @ts-ignore
        if (!verifySignature(signature, req.rawBody, project.webhook_secret)) {
            res.statusCode = 403;
            return res.end();
        }

        res.statusCode = await releaseNotification(channelID, project.role_id, req);
        return res.end();
    });

    /*********
     * START *
     *********/

    app.listen(PORT, () => console.log(`Started REST API on port ${PORT}.`));
}
