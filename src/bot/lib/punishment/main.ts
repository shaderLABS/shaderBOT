import { formatContextURL, parseUser } from '../misc.js';
import { formatTimeDate } from '../time.js';
import { TimeoutEntry } from '../timeoutStore.js';

export abstract class Punishment {
    public readonly id: string;
    public readonly userID: string;
    public readonly moderatorID?: string;
    public readonly timestamp: Date;

    public reason: string;
    public contextURL?: string;
    public editTimestamp?: Date;
    public editModeratorID?: string;

    constructor(data: {
        id: string;
        user_id: string;
        mod_id?: string;
        reason: string;
        context_url?: string;
        edited_timestamp?: string | number | Date;
        edited_mod_id?: string;
        timestamp: string | number | Date;
    }) {
        this.id = data.id;
        this.userID = data.user_id;
        this.moderatorID = data.mod_id;
        this.timestamp = new Date(data.timestamp);
        this.reason = data.reason;
        this.contextURL = data.context_url;
        this.editTimestamp = data.edited_timestamp ? new Date(data.edited_timestamp) : undefined;
        this.editModeratorID = data.edited_mod_id;
    }

    abstract readonly TYPE_STRING: string;
    abstract editReason(newReason: string, moderatorID: string): Promise<string>;

    public toString(includeUser: boolean = true) {
        let string = '';

        if (includeUser) {
            string += `**User:** ${parseUser(this.userID)}\n`;
        }

        string +=
            `**Reason:** ${this.reason}\n` +
            `**Moderator:** ${this.moderatorID ? parseUser(this.moderatorID) : 'System'}\n` +
            `**Context:** ${formatContextURL(this.contextURL)}\n` +
            `**Created At:** ${formatTimeDate(this.timestamp)}\n` +
            `**ID:** ${this.id}`;

        if (this.editTimestamp && this.editModeratorID) {
            string += `\n*(last edited by ${parseUser(this.editModeratorID)} at ${formatTimeDate(this.editTimestamp)})*`;
        }

        return string;
    }
}

export abstract class ExpirablePunishment extends Punishment implements TimeoutEntry {
    public expireTimestamp?: Date;

    constructor(data: {
        id: string;
        user_id: string;
        mod_id?: string;
        reason: string;
        context_url?: string;
        edited_timestamp?: string | number | Date;
        edited_mod_id?: string;
        expire_timestamp?: string | number | Date;
        timestamp: string | number | Date;
    }) {
        super(data);
        this.expireTimestamp = data.expire_timestamp ? new Date(data.expire_timestamp) : undefined;
    }

    abstract refresh(): Promise<TimeoutEntry>;

    abstract expire(): Promise<void>;
    abstract lift(liftedModeratorID?: string): Promise<string>;
    abstract editDuration(duration: number, moderatorID: string): Promise<string>;

    public toString(includeUser: boolean = true) {
        let string = '';

        if (includeUser) {
            string += `**User:** ${parseUser(this.userID)}\n`;
        }

        string +=
            `**Reason:** ${this.reason}\n` +
            `**Moderator:** ${this.moderatorID ? parseUser(this.moderatorID) : 'System'}\n` +
            `**Context:** ${formatContextURL(this.contextURL)}\n` +
            `**Created At:** ${formatTimeDate(this.timestamp)}\n` +
            `**Expiring At:** ${this.expireTimestamp ? formatTimeDate(this.expireTimestamp) : 'Permanent'}\n` +
            `**ID:** ${this.id}`;

        if (this.editTimestamp && this.editModeratorID) {
            string += `\n*(last edited by ${parseUser(this.editModeratorID)} at ${formatTimeDate(this.editTimestamp)})*`;
        }

        return string;
    }
}

export abstract class LiftedPunishment extends Punishment {
    public readonly liftedTimestamp: Date;
    public readonly liftedModeratorID?: string;

    constructor(data: {
        id: string;
        user_id: string;
        mod_id?: string;
        reason: string;
        context_url?: string;
        edited_timestamp?: string | number | Date;
        edited_mod_id?: string;
        lifted_timestamp: string | number | Date;
        lifted_mod_id?: string;
        timestamp: string | number | Date;
    }) {
        super(data);
        this.liftedTimestamp = new Date(data.lifted_timestamp);
        this.liftedModeratorID = data.lifted_mod_id;
    }

    abstract delete(moderatorID: string): Promise<string>;
}
