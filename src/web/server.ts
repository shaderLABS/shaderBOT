import express from 'express';
import path from 'path';
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

const pg_store = store(session);

const port = process.env.PORT || 3001;
const dirname = path.resolve();
const app = express();

const server = new apollo.ApolloServer({
    schema: await typegraphql.buildSchema({
        resolvers: [TicketResolver, UserResolver, ProjectResolver],
    }),
    context: ({ req, res }) => ({ req, res }),
    // typeDefs: typedefinitions,
    // // resolvers,
    // // resolvers: [],
    // context: ({ req }) => ({
    //     getUser: () => req.user,
    //     logout: () => req.logOut(),
    // }),
});

server.applyMiddleware({ app });

app.use(
    cors({
        origin: ['http://localhost:5000'],
        credentials: true,
    })
);

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

export function startWebserver() {
    app.listen(port, () => console.log(`Started web server on port ${port}.`));
}
