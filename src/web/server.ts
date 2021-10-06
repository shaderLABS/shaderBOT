import redirect from '@polka/redirect';
import apollo from 'apollo-server-express';
import bodyParser from 'body-parser';
import store from 'connect-pg-simple';
import cors from 'cors';
import session from 'express-session';
import helmet from 'helmet';
import passport from 'passport';
import path from 'path';
import polka from 'polka';
import serveStatic from 'serve-static';
import ssr from 'tossr';
import typegraphql from 'type-graphql';
import { db } from '../db/postgres.js';
import { UserResolver } from '../db/resolvers/UserResolver.js';
import { ProjectResolver } from '../db/resolvers/ProjectResolver.js';
import { ChannelResolver, RoleResolver } from '../db/resolvers/MarkdownResolver.js';
import { production } from '../index.js';
import { authChecker } from './gqlAuth.js';
import './strategies/discord.js';

export const PORT = Number(process.env.PORT) || 3001;
export const DOMAIN = process.env.DOMAIN || 'localhost';
export const URL = `http://${DOMAIN}:${PORT}`;

const app = polka();

export async function startWebserver() {
    /**************
     * MIDDLEWARE *
     **************/

    const pg_store = store(session);

    const server = new apollo.ApolloServer({
        schema: await typegraphql.buildSchema({
            resolvers: [UserResolver, ProjectResolver, ChannelResolver, RoleResolver],
            authChecker,
        }),
        context: ({ req, res }) => ({ req, res }),
    });

    const corsConfig = {
        origin: production ? ['http://jsdom.ssr'] : [`http://${DOMAIN}:5000`, `http://${DOMAIN}:5005`, 'http://jsdom.ssr', URL],
        credentials: true,
    };

    app.use(cors(corsConfig));
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    'default-src': ["'self'"],
                    'img-src': ["'self'", 'cdn.discordapp.com'],
                    'media-src': ["'self'", 'cdn.discordapp.com'],
                    'style-src': ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
                    'font-src': ["'self'", 'fonts.gstatic.com'],
                    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // reeee
                },
            },
        })
    );
    app.use(bodyParser.json());
    // app.use(bodyParser.urlencoded({ extended: true }));

    if (!process.env.SESSION_SECRET) return Promise.reject("The 'SESSION_SECRET' environment variable is required.");
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
        passport.authenticate('discord', (_error, user, info) => {
            if (info && info.error) return redirect(res, URL + '/?error=' + info.error);
            if (!user) return redirect(res, URL + '/?error=1');

            req.logIn(user, (err) => {
                if (err) return redirect(res, URL + '/?error=2');
                return redirect(res, URL);
            });
        })(req, res, next);
    });

    app.get('/api/auth/logout', (req, res) => {
        if (req.session) {
            req.session.destroy(() => {
                res.clearCookie('connect.sid');
                redirect(res, URL);
            });
        } else {
            redirect(res, URL);
        }
    });

    if (production) {
        const DIST_PATH = path.join(path.resolve(), 'dist');
        const ENTRYPOINT = path.join(DIST_PATH, '__app.html');
        const APP = path.join(DIST_PATH, 'build', 'main.js');

        app.use(serveStatic(DIST_PATH));

        app.get('*', async (req, res) => {
            res.end(await ssr.tossr(ENTRYPOINT, APP, req.url, { inlineDynamicImports: true }));
        });
    }

    /*********
     * START *
     *********/

    // @ts-ignore
    server.applyMiddleware({ app, cors: corsConfig });
    app.listen(PORT, () => console.log(`Started web server on port ${PORT}.`));
}

export function stopWebserver() {
    app.server?.close(() => console.log('Stopped web server.'));
}
