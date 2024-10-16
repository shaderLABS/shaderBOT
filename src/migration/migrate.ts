import { connectPostgreSQL, db } from '../db/postgres.ts';

function applyMigration(filename: string) {
    const { exitCode, success } = Bun.spawnSync(['bun', `src/migration/${filename}.ts`], { env: process.env, stdio: ['ignore', 'inherit', 'inherit'] });
    if (!success) {
        throw new Error(`Migration failed with exit code ${exitCode}.`);
    }
}

await connectPostgreSQL();

// TODO: remove passport session

// DEPRECATED BY 2023-11-22 - HAS BEEN REVERTED
// 2023-10-08
// {
//     const MIGRATION_NAME = '2023-10-08';
//     const result = await db.query(/*sql*/ `SELECT 1 FROM information_schema.tables WHERE table_name = 'expiring_juxtapose';`);
//     if (result.rowCount === 0) {
//         console.log(`Applying migration ${MIGRATION_NAME}...`);
//         applyMigration(MIGRATION_NAME);
//     } else {
//         console.log(`Migration ${MIGRATION_NAME} has already been applied.`);
//     }
// }

// 2023-10-09
{
    const MIGRATION_NAME = '2023-10-09';
    const result = await db.query(/*sql*/ `SELECT 1 FROM information_schema.columns WHERE table_name = 'project' AND column_name = 'banner_url';`);
    if (result.rowCount !== 0) {
        console.log(`Applying migration ${MIGRATION_NAME}...`);
        applyMigration(MIGRATION_NAME);
    } else {
        console.log(`Migration ${MIGRATION_NAME} has already been applied.`);
    }
}

// 2023-11-22
{
    const MIGRATION_NAME = '2023-11-22';
    const result = await db.query(/*sql*/ `SELECT 1 FROM information_schema.tables WHERE table_name = 'expiring_juxtapose';`);
    if (result.rowCount !== 0) {
        console.log(`Applying migration ${MIGRATION_NAME}...`);
        applyMigration(MIGRATION_NAME);
    } else {
        console.log(`Migration ${MIGRATION_NAME} has already been applied.`);
    }
}

// 2024-02-29
{
    const MIGRATION_NAME = '2024-02-29';
    const result = await db.query(/*sql*/ `SELECT 1 FROM information_schema.tables WHERE table_name = 'session';`);
    if (result.rowCount !== 0) {
        console.log(`Applying migration ${MIGRATION_NAME}...`);
        applyMigration(MIGRATION_NAME);
    } else {
        console.log(`Migration ${MIGRATION_NAME} has already been applied.`);
    }
}

// 2024-03-25
{
    const MIGRATION_NAME = '2024-03-25';
    const result = await db.query(/*sql*/ `SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_appeal_user_id';`);
    if (result.rowCount === 0) {
        console.log(`Applying migration ${MIGRATION_NAME}...`);
        applyMigration(MIGRATION_NAME);
    } else {
        console.log(`Migration ${MIGRATION_NAME} has already been applied.`);
    }
}

// 2024-03-29
{
    const MIGRATION_NAME = '2024-03-29';
    const result = await db.query(/*sql*/ `SELECT 1 FROM information_schema.tables WHERE table_name = 'channel_slowmode';`);
    if (result.rowCount === 0) {
        console.log(`Applying migration ${MIGRATION_NAME}...`);
        applyMigration(MIGRATION_NAME);
    } else {
        console.log(`Migration ${MIGRATION_NAME} has already been applied.`);
    }
}

// 2024-04-14
{
    const MIGRATION_NAME = '2024-04-14';
    const result = await db.query(/*sql*/ `SELECT 1 FROM information_schema.tables WHERE table_name = 'track';`);
    if (result.rowCount === 0) {
        console.log(`Applying migration ${MIGRATION_NAME}...`);
        applyMigration(MIGRATION_NAME);
    } else {
        console.log(`Migration ${MIGRATION_NAME} has already been applied.`);
    }
}

console.log('All migrations have been applied.');
process.exit();
