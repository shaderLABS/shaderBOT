import bodyParser from 'body-parser';
import store from 'connect-pg-simple';
import cors from 'cors';
import session from 'express-session';
import fssync from 'fs';
import { IncomingMessage } from 'node:http';
import passport from 'passport';
import polka from 'polka';
import { BanAppeal, getUserAppealData } from '../bot/lib/banAppeal.js';
import { NonNullableProperty } from '../bot/lib/misc.js';
import { db } from '../db/postgres.js';
import './strategies/discord.js';
import { DiscordPassportStrategy } from './strategies/discord.js';
import { releaseNotification, verifySignature } from './webhook.js';

const IS_DEVELOPMENT_ENVIRONMENT = process.env.NODE_ENV === 'development';

type AddRawBody<T> = T & { rawBody?: Buffer };
function hasRawBody<T>(record: AddRawBody<T>): record is NonNullableProperty<AddRawBody<T>, 'rawBody'> {
    return Buffer.isBuffer(record.rawBody);
}

export function startWebserver() {
    if (process.env.BOT_ONLY === 'true') return;

    const app = polka();
    const pg_store = store(session);

    /**************
     * MIDDLEWARE *
     **************/

    app.use(
        cors({
            origin: IS_DEVELOPMENT_ENVIRONMENT ? ['http://localhost:3000'] : [],
            credentials: true,
        })
    );

    app.use(
        bodyParser.json({
            verify: (req: AddRawBody<IncomingMessage>, _, buffer) => {
                req.rawBody = buffer;
            },
        })
    );

    if (!process.env.SESSION_SECRET) throw "The 'SESSION_SECRET' environment variable is required.";

    app.use(
        session({
            secret: process.env.SESSION_SECRET,
            cookie: {
                maxAge: 86_400_000, // 1 day
                httpOnly: true,
                secure: !IS_DEVELOPMENT_ENVIRONMENT, // only send cookie over HTTPS, will cause issues if proxy is misconfigured
            },
            resave: false,
            saveUninitialized: false,
            store: new pg_store({ pool: db }),
            proxy: !IS_DEVELOPMENT_ENVIRONMENT, // trust first proxy, must be configured to forward original protocol in X-Forwarded-Proto header
        })
    );

    app.use(passport.initialize());
    app.use(passport.session());

    /**********
     * ROUTES *
     **********/

    app.get('/api/auth/login', passport.authenticate('discord'));

    app.get('/api/auth/redirect', (req, res, next) => {
        passport.authenticate('discord', (_err: any, user?: Express.User | false | null, info?: DiscordPassportStrategy.Info) => {
            if (info?.error) {
                res.setHeader('Location', '/?error=' + info.error);
                res.statusCode = 302;
                res.end();
                return;
            }

            if (!user) {
                res.setHeader('Location', '/?error=1');
                res.statusCode = 302;
                res.end();
                return;
            }

            req.logIn(user, (err) => {
                res.setHeader('Location', err ? '/?error=2' : '/');
                res.statusCode = 302;
                res.end();
            });
        })(req, res, next);
    });

    app.post('/api/auth/logout', (req, res) => {
        if (req.isUnauthenticated()) {
            res.statusCode = 401;
            res.end('Unauthorized');
            return;
        }

        if (req.session) {
            req.session.destroy(() => {
                // clear session cookie
                res.setHeader('Set-Cookie', `connect.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT`);

                res.statusCode = 200;
                res.end('OK');
            });
        } else {
            res.statusCode = 400;
            res.end('Bad Request');
        }
    });

    app.get('/api/user/me', (req, res) => {
        // 200 OK - user is logged in, data in response
        // 204 No Content - user not logged in, no data available

        if (req.isUnauthenticated()) {
            res.statusCode = 204;
            res.end('No Content');
            return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(req.user));
    });

    app.get('/api/ban/me', async (req, res) => {
        if (req.isUnauthenticated()) {
            res.statusCode = 401;
            res.end('Unauthorized');
            return;
        }

        // @ts-expect-error
        const userID = req.user?.id;

        try {
            const banInformation = JSON.stringify(await getUserAppealData(userID));
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(banInformation);
        } catch (error) {
            console.error('/api/ban/me', userID, error);
            res.statusCode = 400;
            res.end('Bad Request');
        }
    });

    app.post('/api/appeal', async (req, res) => {
        if (req.isUnauthenticated()) {
            res.statusCode = 401;
            res.end('Unauthorized');
            return;
        }

        // @ts-expect-error
        const userID = req.user?.id;
        const reason = req.body?.reason;

        try {
            await BanAppeal.create(userID, reason);
            res.statusCode = 200;
            res.end('OK');
        } catch (error) {
            console.error('/api/appeal', userID, error);
            res.statusCode = 400;
            res.end('Bad Request');
        }
    });

    app.post('/api/webhook/release/:id', async (req, res) => {
        const channelID = req.params.id;
        if (/\D/.test(channelID) || !hasRawBody(req)) {
            res.statusCode = 400;
            res.end();
            return;
        }

        const signature = req.headers['x-hub-signature-256'];
        if (!signature || Array.isArray(signature)) {
            res.statusCode = 400;
            res.end();
            return;
        }

        const project = (
            await db.query({
                text: /*sql*/ `SELECT role_id, encode(webhook_secret, 'hex') AS webhook_secret FROM project WHERE channel_id = $1;`,
                values: [channelID],
                name: 'project-get-webhook-secret',
            })
        ).rows[0];

        if (!project || !project.webhook_secret || !project.role_id) {
            res.statusCode = 404;
            res.end();
            return;
        }

        if (!verifySignature(signature, req.rawBody, project.webhook_secret)) {
            res.statusCode = 403;
            res.end();
            return;
        }

        res.statusCode = await releaseNotification(channelID, project.role_id, req);
        res.end();
    });

    /*********
     * START *
     *********/

    if (process.env.IPC_PATH) {
        const path = process.env.IPC_PATH;
        const previousFile = fssync.statSync(path, { throwIfNoEntry: false });

        if (previousFile) {
            if (previousFile.isSocket()) {
                fssync.unlinkSync(path);
                console.log(`Removed previous UNIX socket "${path}".`);
            } else {
                throw new Error(`File "${path}" already exists and is not a socket.`);
            }
        }

        app.listen({ path }, () => {
            fssync.chmodSync(path, 0o660);
            console.log(`Started REST API on UNIX socket "${path}".`);
        });
    } else {
        const port = Number(process.env.PORT) || 3001;
        app.listen({ port }, () => console.log(`Started REST API on port ${port}.`));
    }
}
