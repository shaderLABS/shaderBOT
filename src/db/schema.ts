import { check, customType, foreignKey, index, numeric, pgTable, smallint, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import * as sql from 'drizzle-orm/sql';

const bytea = customType<{
    data: Buffer;
    default: false;
}>({
    dataType() {
        return 'bytea';
    },
});

export const mute = pgTable(
    'mute',
    {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: numeric({ precision: 20, scale: 0 }).notNull(),
        moderatorId: numeric({ precision: 20, scale: 0 }),
        reason: text().notNull(),
        contextUrl: text(),
        editTimestamp: timestamp({ withTimezone: true, mode: 'date' }),
        editModeratorId: numeric({ precision: 20, scale: 0 }),
        expireTimestamp: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
        timestamp: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    },
    (table) => [index().using('hash', table.userId)],
);

export const kick = pgTable(
    'kick',
    {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: numeric({ precision: 20, scale: 0 }).notNull(),
        moderatorId: numeric({ precision: 20, scale: 0 }),
        reason: text().notNull(),
        contextUrl: text(),
        editTimestamp: timestamp({ withTimezone: true, mode: 'date' }),
        editModeratorId: numeric({ precision: 20, scale: 0 }),
        timestamp: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    },
    (table) => [index().using('hash', table.userId)],
);

export const track = pgTable(
    'track',
    {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: numeric({ precision: 20, scale: 0 }).notNull(),
        moderatorId: numeric({ precision: 20, scale: 0 }),
        reason: text().notNull(),
        contextUrl: text(),
        editTimestamp: timestamp({ withTimezone: true, mode: 'date' }),
        editModeratorId: numeric({ precision: 20, scale: 0 }),
        timestamp: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    },
    (table) => [index().using('hash', table.userId)],
);

export const channelLock = pgTable('channel_lock', {
    id: uuid().defaultRandom().primaryKey().notNull(),
    channelId: numeric({ precision: 20, scale: 0 }).notNull(),
    originalPermissions: smallint().notNull(),
    expireTimestamp: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
});

export const channelSlowmode = pgTable('channel_slowmode', {
    id: uuid().defaultRandom().primaryKey().notNull(),
    channelId: numeric({ precision: 20, scale: 0 }).notNull(),
    originalSlowmode: smallint().notNull(),
    expireTimestamp: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
});

export const ban = pgTable(
    'ban',
    {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: numeric({ precision: 20, scale: 0 }).notNull(),
        moderatorId: numeric({ precision: 20, scale: 0 }),
        reason: text().notNull(),
        contextUrl: text(),
        editTimestamp: timestamp({ withTimezone: true, mode: 'date' }),
        editModeratorId: numeric({ precision: 20, scale: 0 }),
        expireTimestamp: timestamp({ withTimezone: true, mode: 'date' }),
        timestamp: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    },
    (table) => [index().using('hash', table.userId)],
);

export const liftedMute = pgTable(
    'lifted_mute',
    {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: numeric({ precision: 20, scale: 0 }).notNull(),
        moderatorId: numeric({ precision: 20, scale: 0 }),
        reason: text().notNull(),
        contextUrl: text(),
        editTimestamp: timestamp({ withTimezone: true, mode: 'date' }),
        editModeratorId: numeric({ precision: 20, scale: 0 }),
        liftedTimestamp: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
        liftedModeratorId: numeric({ precision: 20, scale: 0 }),
        timestamp: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    },
    (table) => [index().using('hash', table.userId)],
);

export const note = pgTable(
    'note',
    {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: numeric({ precision: 20, scale: 0 }).notNull(),
        moderatorId: numeric({ precision: 20, scale: 0 }).notNull(),
        content: text(),
        contextUrl: text(),
        editTimestamp: timestamp({ withTimezone: true, mode: 'date' }),
        editModeratorId: numeric({ precision: 20, scale: 0 }),
        timestamp: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    },
    (table) => [index().using('hash', table.userId)],
);

export const liftedBan = pgTable(
    'lifted_ban',
    {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: numeric({ precision: 20, scale: 0 }).notNull(),
        moderatorId: numeric({ precision: 20, scale: 0 }),
        reason: text().notNull(),
        contextUrl: text(),
        editTimestamp: timestamp({ withTimezone: true, mode: 'date' }),
        editModeratorId: numeric({ precision: 20, scale: 0 }),
        liftedTimestamp: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
        liftedModeratorId: numeric({ precision: 20, scale: 0 }),
        timestamp: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    },
    (table) => [index().using('hash', table.userId)],
);

export const appeal = pgTable(
    'appeal',
    {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: numeric({ precision: 20, scale: 0 }).notNull(),
        reason: text().notNull(),
        result: text().$type<'pending' | 'declined' | 'accepted' | 'expired'>().notNull(),
        resultReason: text(),
        resultModeratorId: numeric({ precision: 20, scale: 0 }),
        resultTimestamp: timestamp({ withTimezone: true, mode: 'date' }),
        resultEditModeratorId: numeric({ precision: 20, scale: 0 }),
        resultEditTimestamp: timestamp({ withTimezone: true, mode: 'date' }),
        messageId: numeric({ precision: 20, scale: 0 }),
        timestamp: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    },
    (table) => [index().using('hash', table.userId)],
);

export const project = pgTable(
    'project',
    {
        id: uuid().defaultRandom().primaryKey().notNull(),
        channelId: numeric({ precision: 20, scale: 0 }).notNull(),
        ownerIds: numeric({ precision: 20, scale: 0 }).array().notNull(),
        roleId: numeric({ precision: 20, scale: 0 }),
        bannerMessageId: text(),
        bannerLastTimestamp: timestamp({ withTimezone: true, mode: 'date' }),
        webhookSecret: bytea('webhook_secret'),
    },
    (table) => [unique().on(table.channelId), unique().on(table.roleId)],
);

export const projectMute = pgTable(
    'project_mute',
    {
        id: uuid().defaultRandom().primaryKey().notNull(),
        projectId: uuid().notNull(),
        userId: numeric({ precision: 20, scale: 0 }).notNull(),
        timestamp: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    },
    (table) => [
        index().using('hash', table.userId),
        foreignKey({
            columns: [table.projectId],
            foreignColumns: [project.id],
        }),
    ],
);

export const warn = pgTable(
    'warn',
    {
        id: uuid().defaultRandom().primaryKey().notNull(),
        userId: numeric({ precision: 20, scale: 0 }).notNull(),
        moderatorId: numeric({ precision: 20, scale: 0 }).notNull(),
        severity: smallint().$type<0 | 1 | 2 | 3>().notNull(),
        reason: text().notNull(),
        editTimestamp: timestamp({ withTimezone: true, mode: 'date' }),
        editModeratorId: numeric({ precision: 20, scale: 0 }),
        timestamp: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
        contextUrl: text(),
    },
    (table) => [index().using('hash', table.userId), check('severity_range_check', sql.between(table.severity, 0, 3).inlineParams())],
);

export const stickyThread = pgTable(
    'sticky_thread',
    {
        id: uuid().defaultRandom().primaryKey().notNull(),
        channelId: numeric({ precision: 20, scale: 0 }).notNull(),
        threadId: numeric({ precision: 20, scale: 0 }).notNull(),
        moderatorId: numeric({ precision: 20, scale: 0 }),
    },
    (table) => [unique().on(table.threadId)],
);
