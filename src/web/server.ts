import apollo from 'apollo-server-express';
import store from 'connect-pg-simple';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import passport from 'passport';
import path from 'path';
import ssr from 'tossr';
import typegraphql from 'type-graphql';
import { db } from '../db/postgres.js';
import { TicketResolver } from '../db/resolvers/TicketResolver.js';
import { UserResolver } from '../db/resolvers/UserResolver.js';
import { ProjectResolver } from '../db/resolvers/ProjectResolver.js';
import { CommentResolver } from '../db/resolvers/CommentResolver.js';
import { ChannelResolver, RoleResolver } from '../db/resolvers/MarkdownResolver.js';
import { authChecker } from './gqlAuth.js';
import routes from './routes/main.js';
import './strategies/discord.js';

const pg_store = store(session);

export const PORT = Number(process.env.PORT) || 3001;
export const DOMAIN = process.env.DOMAIN || 'localhost';
export const URL = `http://${DOMAIN}:${PORT}`;

const app = express();
const production = process.env.NODE_ENV === 'production';

const server = new apollo.ApolloServer({
    schema: await typegraphql.buildSchema({
        resolvers: [TicketResolver, UserResolver, ProjectResolver, CommentResolver, ChannelResolver, RoleResolver],
        authChecker,
    }),
    context: ({ req, res }) => ({ req, res }),
    playground: !production,
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
app.use(express.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'SECRET',
        cookie: { maxAge: 60000 * 60 * 24 },
        resave: false,
        saveUninitialized: false,
        store: new pg_store({ pool: db }),
    })
);
app.use(passport.initialize());
app.use(passport.session());

app.use('/api', routes);

if (production) {
    const DIST_PATH = path.join(path.resolve(), 'dist');
    const ENTRYPOINT = path.join(DIST_PATH, '__app.html');
    const APP = path.join(DIST_PATH, 'build', 'main.js');

    app.use(express.static(DIST_PATH));

    app.get('*', async (req, res) => {
        res.send(await ssr.tossr(ENTRYPOINT, APP, req.url, { inlineDynamicImports: true }));
    });
}

server.applyMiddleware({ app, cors: corsConfig });

export function startWebserver() {
    app.listen(PORT, () => console.log(`Started web server on port ${PORT}.`));
}
