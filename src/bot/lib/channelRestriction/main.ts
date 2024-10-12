import type { TimeoutEntry } from '../timeoutStore.ts';

export abstract class ChannelRestriction implements TimeoutEntry {
    public readonly id: string;
    public readonly channelId: string;
    public readonly expireTimestamp: Date;

    constructor(data: { id: string; channelId: string; expireTimestamp: Date }) {
        this.id = data.id;
        this.channelId = data.channelId;
        this.expireTimestamp = data.expireTimestamp;
    }

    abstract refresh(): Promise<ChannelRestriction>;
    abstract expire(): Promise<void>;
    abstract delete(): Promise<void>;
    abstract lift(moderatorID: string): Promise<string>;
}
