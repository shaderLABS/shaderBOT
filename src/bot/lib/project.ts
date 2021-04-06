import { PermissionOverwriteOption } from 'discord.js';

export const ownerOverwrites: PermissionOverwriteOption = {
    MANAGE_WEBHOOKS: true,
    VIEW_CHANNEL: true,
    SEND_MESSAGES: true,
    SEND_TTS_MESSAGES: true,
    MANAGE_MESSAGES: true,
    EMBED_LINKS: true,
    ATTACH_FILES: true,
    READ_MESSAGE_HISTORY: true,
    USE_EXTERNAL_EMOJIS: true,
    ADD_REACTIONS: true,
};
