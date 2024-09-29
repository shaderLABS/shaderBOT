import cors from '@elysiajs/cors';
import jwt from '@elysiajs/jwt';
import { Discord, OAuth2RequestError, generateState } from 'arctic';
import type { APIUser } from 'discord.js';
import { Elysia, t, type CookieOptions } from 'elysia';
import fs from 'node:fs';
import path from 'node:path';
import { client } from '../bot/bot.ts';
import { BanAppeal, getUserAppealData } from '../bot/lib/banAppeal.ts';
import { getGuild } from '../bot/lib/misc.ts';
import { db } from '../db/postgres.ts';
import type { API } from './api.ts';
import { GITHUB_RELEASE_WEBHOOK_BODY, releaseNotification, verifySignature } from './webhook.ts';

const IS_DEVELOPMENT_ENVIRONMENT = process.env.NODE_ENV === 'development';

const COOKIE_CONFIGURATION: Pick<CookieOptions, 'sameSite' | 'secure'> = {
    sameSite: IS_DEVELOPMENT_ENVIRONMENT ? 'lax' : 'strict',
    secure: !IS_DEVELOPMENT_ENVIRONMENT,
};

export function startWebserver() {
    if (process.env.BOT_ONLY === 'true') return;
    if (!process.env.SESSION_SECRET) throw "The 'SESSION_SECRET' environment variable is required.";
    if (!process.env.APPLICATION_CLIENT_ID) throw "The 'APPLICATION_CLIENT_ID' environment variable is required.";
    if (!process.env.APPLICATION_CLIENT_SECRET) throw "The 'APPLICATION_CLIENT_SECRET' environment variable is required.";
    if (!process.env.DOMAIN && !IS_DEVELOPMENT_ENVIRONMENT) throw "The 'DOMAIN' environment variable is required in production.";

    const discordOAuthProvider = new Discord(
        process.env.APPLICATION_CLIENT_ID,
        process.env.APPLICATION_CLIENT_SECRET,
        IS_DEVELOPMENT_ENVIRONMENT ? 'http://localhost:3001/api/auth/redirect' : `https://${process.env.DOMAIN}/api/auth/redirect`
    );

    /**************
     * MIDDLEWARE *
     **************/

    const app = new Elysia()
        .use(
            cors({
                origin: IS_DEVELOPMENT_ENVIRONMENT,
                methods: ['GET', 'POST'],
                credentials: true,
            })
        )
        .use(jwt({ secret: process.env.SESSION_SECRET, schema: t.Object({ id: t.String() }), exp: '1d' }))
        .derive(async ({ cookie: { discord_auth }, jwt }): Promise<{ user: { id: string } | null }> => {
            return {
                user: (await jwt.verify(discord_auth.value)) || null,
            };
        });

    /**********
     * ROUTES *
     **********/

    app.get('/api/auth/login', async ({ cookie: { discord_oauth_state }, redirect }) => {
        const state = generateState();
        const url = await discordOAuthProvider.createAuthorizationURL(state, { scopes: ['identify'] });

        discord_oauth_state.set({
            value: state,
            maxAge: 600, // 10 minutes
            httpOnly: true,
            ...COOKIE_CONFIGURATION,
        });

        return redirect(url.toString());
    });

    app.get(
        '/api/auth/redirect',
        async ({ query: { code, state }, cookie: { discord_oauth_state, discord_auth }, jwt, error, redirect }) => {
            if (state !== discord_oauth_state.value) {
                return error('Bad Request');
            }

            try {
                const tokens = await discordOAuthProvider.validateAuthorizationCode(code);
                const discordUserResponse = await fetch('https://discord.com/api/users/@me', {
                    headers: {
                        Authorization: `Bearer ${tokens.accessToken}`,
                    },
                });

                const discordUser: APIUser = await discordUserResponse.json();

                discord_auth.set({
                    value: await jwt.sign({ id: discordUser.id }),
                    path: '/',
                    maxAge: 86_400, // 1 day
                    httpOnly: true,
                    ...COOKIE_CONFIGURATION,
                });

                discord_oauth_state.remove();

                return redirect('/');
            } catch (errorMessage) {
                if (errorMessage instanceof OAuth2RequestError) {
                    return error('Bad Request');
                } else {
                    console.error(errorMessage);
                    return error('Internal Server Error');
                }
            }
        },
        { query: t.Object({ code: t.String(), state: t.String() }) }
    );

    app.post('/api/auth/logout', async ({ user, cookie: { discord_auth }, error }) => {
        if (!user) {
            return error('Unauthorized');
        }

        discord_auth.remove();

        return error('No Content');
    });

    app.get('/api/user/me', async ({ user, error }) => {
        // 200 OK - user is logged in, data in response
        // 204 No Content - user not logged in, no data available
        // 404 Not Found - user not found in Discord, no data available

        if (!user) {
            return error('No Content');
        }

        const discordUser = await client.users.fetch(user.id)?.catch(() => undefined);

        if (!discordUser) {
            return error('Not Found');
        }

        const data: API.UserInformation = {
            id: discordUser.id,
            username: discordUser.username,
            avatarURL: discordUser.displayAvatarURL(),
            isBanned: Boolean(
                await getGuild()
                    .bans.fetch(discordUser)
                    .catch(() => undefined)
            ),
        };

        return data;
    });

    app.get('/api/ban/me', async ({ user, error }) => {
        if (!user) {
            return error('Unauthorized');
        }

        try {
            return await getUserAppealData(user.id);
        } catch (errorMessage) {
            console.error('/api/ban/me', user.id, errorMessage);
            return error('Internal Server Error');
        }
    });

    app.post(
        '/api/appeal',
        async ({ user, body: { reason }, error }) => {
            if (!user) {
                return error('Unauthorized');
            }

            try {
                await BanAppeal.create(user.id, reason);
                return error('No Content');
            } catch (errorMessage) {
                console.error('/api/appeal', user.id, errorMessage);
                return error('Bad Request');
            }
        },
        { body: t.Object({ reason: t.String() }) }
    );

    app.post(
        '/api/webhook/release/:channelID',
        async ({ params: { channelID }, body, request, headers: { 'x-hub-signature-256': signature }, error }) => {
            const project = (
                await db.query({
                    text: /*sql*/ `SELECT role_id, encode(webhook_secret, 'hex') AS webhook_secret FROM project WHERE channel_id = $1;`,
                    values: [channelID],
                    name: 'project-get-webhook-secret',
                })
            ).rows[0];

            if (!project || !project.webhook_secret || !project.role_id) {
                return error('Not Found');
            }

            const rawBodyBuffer = Buffer.from(await request.clone().arrayBuffer());
            if (!verifySignature(signature, rawBodyBuffer, project.webhook_secret)) {
                return error('Forbidden');
            }

            const statusCode = await releaseNotification(channelID, project.role_id, body);
            return error(statusCode);
        },
        {
            type: 'json',
            body: GITHUB_RELEASE_WEBHOOK_BODY,
            params: t.Object({ channelID: t.String({ pattern: '^[0-9]+$', default: '0', examples: '1044804143455420539' }) }),
            headers: t.Object({ 'x-hub-signature-256': t.String({ pattern: '^sha256=[0-9a-f]{64}$', default: 'sha256=0' }), 'x-github-event': t.Literal('release') }),
        }
    );

    /*********
     * START *
     *********/

    if (process.env.UDS_PATH) {
        if (process.platform === 'win32') throw new Error('UNIX sockets are not supported on Windows.');

        const udsPath = process.env.UDS_PATH;
        const udsDirectory = path.dirname(udsPath);

        if (fs.existsSync(udsDirectory)) {
            const previousFile = fs.statSync(udsPath, { throwIfNoEntry: false });

            if (previousFile) {
                if (previousFile.isSocket()) {
                    fs.unlinkSync(udsPath);
                    console.log(`Removed previous UNIX socket "${udsPath}".`);
                } else {
                    throw new Error(`File "${udsPath}" already exists and is not a socket.`);
                }
            }
        } else {
            fs.mkdirSync(udsDirectory, { recursive: true });
            console.log(`Created directory for UNIX socket "${udsDirectory}".`);
        }

        app.listen({ unix: udsPath }, () => {
            console.log(`Started HTTP API on UNIX socket "${udsPath}".`);

            if (process.env.UDS_UID || process.env.UDS_GID) {
                fs.chownSync(udsPath, Number(process.env.UDS_UID || -1), Number(process.env.UDS_GID || -1));
            }

            fs.chmodSync(udsPath, 0o660);

            const udsStat = fs.statSync(udsPath);
            console.log(`Set UID to ${udsStat.uid}, GID to ${udsStat.gid} and mode to ${udsStat.mode.toString(8)} for UNIX socket "${udsPath}".`);
        });
    } else {
        const port = Number(process.env.PORT) || 3001;
        app.listen({ port }, () => console.log(`Started HTTP API on port ${port}.`));
    }
}
