import { formatContextURL, parseUser } from '../misc.ts';
import { formatTimeDate } from '../time.ts';
import type { TimeoutEntry } from '../timeoutStore.ts';

export abstract class Punishment {
    public readonly id: string;
    public readonly userId: string;
    public readonly moderatorId: string | null;
    public readonly timestamp: Date;

    public reason: string;
    public contextUrl: string | null;
    public editTimestamp: Date | null;
    public editModeratorId: string | null;

    constructor(data: {
        id: string;
        userId: string;
        moderatorId: string | null;
        reason: string;
        contextUrl: string | null;
        editTimestamp: Date | null;
        editModeratorId: string | null;
        timestamp: Date;
    }) {
        this.id = data.id;
        this.userId = data.userId;
        this.moderatorId = data.moderatorId;
        this.timestamp = data.timestamp;
        this.reason = data.reason;
        this.contextUrl = data.contextUrl;
        this.editTimestamp = data.editTimestamp;
        this.editModeratorId = data.editModeratorId;
    }

    abstract readonly TYPE_STRING: string;
    abstract editReason(newReason: string, moderatorID: string): Promise<string>;

    public toString(includeUser: boolean = true) {
        let string = '';

        if (includeUser) {
            string += `**User:** ${parseUser(this.userId)}\n`;
        }

        string +=
            `**Reason:** ${this.reason}\n` +
            `**Moderator:** ${this.moderatorId ? parseUser(this.moderatorId) : 'System'}\n` +
            `**Context:** ${formatContextURL(this.contextUrl)}\n` +
            `**Created At:** ${formatTimeDate(this.timestamp)}\n` +
            `**ID:** ${this.id}`;

        if (this.editTimestamp && this.editModeratorId) {
            string += `\n*(last edited by ${parseUser(this.editModeratorId)} at ${formatTimeDate(this.editTimestamp)})*`;
        }

        return string;
    }
}

export abstract class ExpirablePunishment extends Punishment implements TimeoutEntry {
    public expireTimestamp: Date | null;

    constructor(data: {
        id: string;
        userId: string;
        moderatorId: string | null;
        reason: string;
        contextUrl: string | null;
        editTimestamp: Date | null;
        editModeratorId: string | null;
        expireTimestamp: Date | null;
        timestamp: Date;
    }) {
        super(data);
        this.expireTimestamp = data.expireTimestamp;
    }

    abstract refresh(): Promise<TimeoutEntry>;

    abstract expire(): Promise<void>;
    abstract lift(liftedModeratorID?: string): Promise<string>;
    abstract editDuration(duration: number, moderatorID: string): Promise<string>;

    public toString(includeUser: boolean = true) {
        let string = '';

        if (includeUser) {
            string += `**User:** ${parseUser(this.userId)}\n`;
        }

        string +=
            `**Reason:** ${this.reason}\n` +
            `**Moderator:** ${this.moderatorId ? parseUser(this.moderatorId) : 'System'}\n` +
            `**Context:** ${formatContextURL(this.contextUrl)}\n` +
            `**Created At:** ${formatTimeDate(this.timestamp)}\n` +
            `**Expiring At:** ${this.expireTimestamp ? formatTimeDate(this.expireTimestamp) : 'Permanent'}\n` +
            `**ID:** ${this.id}`;

        if (this.editTimestamp && this.editModeratorId) {
            string += `\n*(last edited by ${parseUser(this.editModeratorId)} at ${formatTimeDate(this.editTimestamp)})*`;
        }

        return string;
    }
}

export abstract class LiftedPunishment extends Punishment {
    public readonly liftedTimestamp: Date;
    public readonly liftedModeratorId: string | null;

    constructor(data: {
        id: string;
        userId: string;
        moderatorId: string | null;
        reason: string;
        contextUrl: string | null;
        editTimestamp: Date | null;
        editModeratorId: string | null;
        liftedTimestamp: Date;
        liftedModeratorId: string | null;
        timestamp: Date;
    }) {
        super(data);
        this.liftedTimestamp = data.liftedTimestamp;
        this.liftedModeratorId = data.liftedModeratorId;
    }

    abstract delete(moderatorID: string): Promise<string>;
}
