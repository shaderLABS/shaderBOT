export namespace API {
    export type UserInformation = {
        id: string;
        username: string;
        avatarURL: string;
        isBanned: boolean;
    };

    export type BanAppeal = {
        result: 'pending' | 'declined' | 'accepted' | 'expired';
        resultReason?: string;
        resultTimestamp?: string;
        timestamp: string;
    };

    export type BanInformation = {
        id: string;
        moderator?: {
            id: string;
            username: string;
        };
        appeal?: BanAppeal;
        appealCooldown: number;
        reason: string;
        contextURL?: string;
        expireTimestamp?: string;
        timestamp: string;
    };
}
