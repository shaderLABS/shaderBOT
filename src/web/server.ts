import express from 'express';
import helmet from 'helmet';
import passport from 'passport';
import routes from './routes/main.js';
import session from 'express-session';
import store from 'connect-pg-simple';
import cors from 'cors';
import apollo from 'apollo-server-express';
import ssr from 'tossr';

import './strategies/discord.js';
import { db } from '../db/postgres.js';
import typegraphql from 'type-graphql';
import { TicketResolver } from '../db/resolvers/TicketResolver.js';
import { UserResolver } from '../db/resolvers/UserResolver.js';
import { ProjectResolver } from '../db/resolvers/ProjectResolver.js';
import { CommentResolver } from '../db/resolvers/CommentResolver.js';
import { authChecker } from './gqlAuth.js';
import path from 'path';

const pg_store = store(session);

const port = Number(process.env.PORT) || 3001;
const app = express();
const production = process.env.NODE_ENV === 'production';

const server = new apollo.ApolloServer({
    schema: await typegraphql.buildSchema({
        resolvers: [TicketResolver, UserResolver, ProjectResolver, CommentResolver],
        authChecker,
    }),
    context: ({ req, res }) => ({ req, res }),
    playground: !production,
});

const corsConfig = {
    origin: ['http://localhost:5000', 'http://localhost:5005', 'http://localhost'],
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

console.log(path.resolve());

if (production) {
    const DISTPATH = path.join(path.resolve(), 'dist');
    const ENTRYPOINT = path.join(DISTPATH, '__app.html');
    const APP = path.join(DISTPATH, 'build', 'bundle.js');

    app.use(express.static(DISTPATH));

    app.get('*', async (req, res) => {
        const html = await ssr.tossr(ENTRYPOINT, APP, req.url, { inlineDynamicImports: true, timeout: 10000 });
        res.send(html);
    });
}

server.applyMiddleware({ app, cors: corsConfig });

export function startWebserver() {
    app.listen(port, /*'192.168.0.12',*/ () => console.log(`Started web server on port ${port}.`));
}
