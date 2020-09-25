import express from 'express';
import helmet from 'helmet';
import passport from 'passport';
import routes from './routes/main.js';
import session from 'express-session';
import store from 'connect-pg-simple';
import cors from 'cors';
import apollo from 'apollo-server-express';

import './strategies/discord.js';
import { db } from '../db/postgres.js';
import typegraphql from 'type-graphql';
import { TicketResolver } from '../db/resolvers/TicketResolver.js';
import { UserResolver } from '../db/resolvers/UserResolver.js';
import { ProjectResolver } from '../db/resolvers/ProjectResolver.js';
import { CommentResolver } from '../db/resolvers/CommentResolver.js';
import { authChecker } from './gqlAuth.js';

const pg_store = store(session);

const port = Number(process.env.PORT) || 3001;
const app = express();

const server = new apollo.ApolloServer({
    schema: await typegraphql.buildSchema({
        resolvers: [TicketResolver, UserResolver, ProjectResolver, CommentResolver],
        authChecker,
    }),
    context: ({ req, res }) => ({ req, res }),
    // playground: false
});

const corsConfig = {
    origin: ['http://localhost:5000'],
    credentials: true,
};

app.use(cors(corsConfig));
app.use(helmet());
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

server.applyMiddleware({ app, cors: corsConfig });

export function startWebserver() {
    app.listen(port, /*'192.168.0.12',*/ () => console.log(`Started web server on port ${port}.`));
}
