import { GuildMember, User } from 'discord.js';

export class CooldownStore {
    private data: string[] = [];

    public add(key: string, user: User | GuildMember, time: number): void {
        const id = user.id + ':' + key;

        this.data.push(id);
        setTimeout(() => (this.data = this.data.filter((entry) => entry !== id)), time);
    }

    public has(key: string, user: User | GuildMember): boolean {
        return this.data.includes(user.id + ':' + key);
    }
}
