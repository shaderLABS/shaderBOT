import { TimeoutEntry } from '../timeoutStore.js';

export abstract class ChannelRestriction implements TimeoutEntry {
    public readonly id: string;
    public readonly channelID: string;
    public readonly expireTimestamp: Date;

    constructor(data: { id: string; channel_id: string; expire_timestamp: string | number | Date }) {
        this.id = data.id;
        this.channelID = data.channel_id;
        this.expireTimestamp = new Date(data.expire_timestamp);
    }

    abstract refresh(): Promise<ChannelRestriction>;
    abstract expire(): Promise<void>;
    abstract delete(): Promise<void>;
    abstract lift(moderatorID: string): Promise<string>;
}
