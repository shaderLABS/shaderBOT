import { unionAll } from 'drizzle-orm/pg-core';
import * as sql from 'drizzle-orm/sql';
import type { PunishmentTableOid } from '../bot/lib/context.ts';
import { db } from './postgres.ts';
import * as schema from './schema.ts';

export namespace Query {
    export namespace Context {
        const _ALL_BY_USERID = db.$with('entries').as(
            unionAll(
                db
                    .select({ id: schema.ban.id, timestamp: schema.ban.timestamp, tableoid: sql.sql<PunishmentTableOid>`tableoid::regclass`.as('tableoid') })
                    .from(schema.ban)
                    .where(sql.eq(schema.ban.userId, sql.sql.placeholder('userId'))),
                db
                    .select({ id: schema.mute.id, timestamp: schema.mute.timestamp, tableoid: sql.sql<PunishmentTableOid>`tableoid::regclass`.as('tableoid') })
                    .from(schema.mute)
                    .where(sql.eq(schema.mute.userId, sql.sql.placeholder('userId'))),
                db
                    .select({ id: schema.track.id, timestamp: schema.track.timestamp, tableoid: sql.sql<PunishmentTableOid>`tableoid::regclass`.as('tableoid') })
                    .from(schema.track)
                    .where(sql.eq(schema.track.userId, sql.sql.placeholder('userId'))),
                db
                    .select({ id: schema.kick.id, timestamp: schema.kick.timestamp, tableoid: sql.sql<PunishmentTableOid>`tableoid::regclass`.as('tableoid') })
                    .from(schema.kick)
                    .where(sql.eq(schema.kick.userId, sql.sql.placeholder('userId')))
                    .orderBy(sql.desc(schema.kick.timestamp))
                    .limit(1),
                db
                    .select({ id: schema.liftedBan.id, timestamp: schema.liftedBan.timestamp, tableoid: sql.sql<PunishmentTableOid>`tableoid::regclass`.as('tableoid') })
                    .from(schema.liftedBan)
                    .where(sql.eq(schema.liftedBan.userId, sql.sql.placeholder('userId')))
                    .orderBy(sql.desc(schema.liftedBan.timestamp))
                    .limit(1),
                db
                    .select({ id: schema.liftedMute.id, timestamp: schema.liftedMute.timestamp, tableoid: sql.sql<PunishmentTableOid>`tableoid::regclass`.as('tableoid') })
                    .from(schema.liftedMute)
                    .where(sql.eq(schema.liftedMute.userId, sql.sql.placeholder('userId')))
                    .orderBy(sql.desc(schema.liftedMute.timestamp))
                    .limit(1),
                db
                    .select({ id: schema.note.id, timestamp: schema.note.timestamp, tableoid: sql.sql<PunishmentTableOid>`tableoid::regclass`.as('tableoid') })
                    .from(schema.note)
                    .where(sql.eq(schema.note.userId, sql.sql.placeholder('userId')))
                    .orderBy(sql.desc(schema.note.timestamp))
                    .limit(1),
                db
                    .select({ id: schema.warn.id, timestamp: schema.warn.timestamp, tableoid: sql.sql<PunishmentTableOid>`tableoid::regclass`.as('tableoid') })
                    .from(schema.warn)
                    .where(sql.eq(schema.warn.userId, sql.sql.placeholder('userId')))
                    .orderBy(sql.desc(schema.warn.timestamp))
                    .limit(1),
            ),
        );

        export const LATEST_BY_USERID = db
            .with(_ALL_BY_USERID)
            .select({
                id: _ALL_BY_USERID.id,
                tableoid: _ALL_BY_USERID.tableoid,
            })
            .from(_ALL_BY_USERID)
            .orderBy(sql.desc(_ALL_BY_USERID.timestamp))
            .limit(1)
            .prepare('context-by-userid');

        export const BY_UUID = unionAll(
            db
                .select({ userId: schema.ban.userId, tableoid: sql.sql<PunishmentTableOid>`tableoid::regclass`.as('tableoid') })
                .from(schema.ban)
                .where(sql.eq(schema.ban.id, sql.sql.placeholder('uuid'))),
            db
                .select({ userId: schema.mute.userId, tableoid: sql.sql<PunishmentTableOid>`tableoid::regclass`.as('tableoid') })
                .from(schema.mute)
                .where(sql.eq(schema.mute.id, sql.sql.placeholder('uuid'))),
            db
                .select({ userId: schema.track.userId, tableoid: sql.sql<PunishmentTableOid>`tableoid::regclass`.as('tableoid') })
                .from(schema.track)
                .where(sql.eq(schema.track.id, sql.sql.placeholder('uuid'))),
            db
                .select({ userId: schema.kick.userId, tableoid: sql.sql<PunishmentTableOid>`tableoid::regclass`.as('tableoid') })
                .from(schema.kick)
                .where(sql.eq(schema.kick.id, sql.sql.placeholder('uuid'))),
            db
                .select({ userId: schema.liftedBan.userId, tableoid: sql.sql<PunishmentTableOid>`tableoid::regclass`.as('tableoid') })
                .from(schema.liftedBan)
                .where(sql.eq(schema.liftedBan.id, sql.sql.placeholder('uuid'))),
            db
                .select({ userId: schema.liftedMute.userId, tableoid: sql.sql<PunishmentTableOid>`tableoid::regclass`.as('tableoid') })
                .from(schema.liftedMute)
                .where(sql.eq(schema.liftedMute.id, sql.sql.placeholder('uuid'))),
            db
                .select({ userId: schema.note.userId, tableoid: sql.sql<PunishmentTableOid>`tableoid::regclass`.as('tableoid') })
                .from(schema.note)
                .where(sql.eq(schema.note.id, sql.sql.placeholder('uuid'))),
            db
                .select({ userId: schema.warn.userId, tableoid: sql.sql<PunishmentTableOid>`tableoid::regclass`.as('tableoid') })
                .from(schema.warn)
                .where(sql.eq(schema.warn.id, sql.sql.placeholder('uuid'))),
        ).prepare('context-by-uuid');
    }

    export namespace AutomaticPunishment {
        const _INDIVIDUAL_EXCLUDED_TIME = unionAll(
            db
                .select({
                    time: sql.sum(sql.sql`EXTRACT(EPOCH FROM (${schema.liftedBan.liftedTimestamp} - GREATEST(${schema.liftedBan.timestamp}, ${sql.sql.placeholder('warningTimestamp')})))`).as('time'),
                })
                .from(schema.liftedBan)
                .where(sql.and(sql.gte(schema.liftedBan.liftedTimestamp, sql.sql.placeholder('warningTimestamp')), sql.eq(schema.liftedBan.userId, sql.sql.placeholder('userId')))),
            db
                .select({
                    time: sql
                        .sum(sql.sql`EXTRACT(EPOCH FROM (${schema.liftedMute.liftedTimestamp} - GREATEST(${schema.liftedMute.timestamp}, ${sql.sql.placeholder('warningTimestamp')})))`)
                        .as('time'),
                })
                .from(schema.liftedMute)
                .where(sql.and(sql.gte(schema.liftedMute.liftedTimestamp, sql.sql.placeholder('warningTimestamp')), sql.eq(schema.liftedMute.userId, sql.sql.placeholder('userId')))),
            db
                .select({ time: sql.sum(sql.sql`EXTRACT(EPOCH FROM (NOW() - GREATEST(${schema.ban.timestamp}, ${sql.sql.placeholder('warningTimestamp')})))`).as('time') })
                .from(schema.ban)
                .where(sql.eq(schema.ban.userId, sql.sql.placeholder('userId'))),
            db
                .select({ time: sql.sum(sql.sql`EXTRACT(EPOCH FROM (NOW() - GREATEST(${schema.mute.timestamp}, ${sql.sql.placeholder('warningTimestamp')})))`).as('time') })
                .from(schema.mute)
                .where(sql.eq(schema.mute.userId, sql.sql.placeholder('userId'))),
        ).as('individualExcludedTime');

        export const EXCLUDED_TIME = db
            .select({ excludedTime: sql.sum(_INDIVIDUAL_EXCLUDED_TIME.time) })
            .from(_INDIVIDUAL_EXCLUDED_TIME)
            .prepare('automatic-punishment-excluded-time');
    }
}
