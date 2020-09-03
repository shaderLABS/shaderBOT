import pg from 'pg';

export const db = new pg.Client({
    user: 'postgres',
    password: 'postgres',
    host: '127.0.0.1',
    port: 5432,
    database: 'shaderBOT',
});

const tables = [
    {
        name: 'ticket',
        data: /*sql*/ `
            ticket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title TEXT UNIQUE NOT NULL,
            project_channel_id NUMERIC(20) NOT NULL,
            description TEXT,
            attachments TEXT[],
            author_id NUMERIC(20) NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
            edited TIMESTAMP WITH TIME ZONE,
            closed BOOLEAN DEFAULT FALSE,
            channel_id NUMERIC(20) UNIQUE,
            subscription_message_id NUMERIC(20) UNIQUE`,
    },
    {
        name: 'comment',
        data: /*sql*/ `
            comment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            ticket_id UUID NOT NULL,
            author_id NUMERIC(20) NOT NULL,
            message_id NUMERIC(20) UNIQUE,
            content TEXT,
            attachments TEXT[],
            timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
            edited TIMESTAMP WITH TIME ZONE`,
    },
    {
        name: 'project',
        data: /*sql*/ `
            project_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            channel_id NUMERIC(20) UNIQUE NOT NULL,
            owners NUMERIC(20)[] NOT NULL,
            role_id NUMERIC(20) UNIQUE NOT NULL`,
    },
];

export async function connectPostgreSQL() {
    try {
        await db.connect();
        console.log('Connected to PostgreSQL database.');

        await db.query(/*sql*/ `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
                                CREATE EXTENSION IF NOT EXISTS "pg_trgm";`);

        let statements = '';
        for (const table of tables) statements += `CREATE TABLE IF NOT EXISTS ${table.name} (${table.data});\n`;
        await db.query(statements);
    } catch (error) {
        console.error(error);
        process.exit();
    }
}
