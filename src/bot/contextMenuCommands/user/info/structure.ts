import { ApplicationCommandType, type ApplicationCommandData } from 'discord.js';

export default {
    name: 'Info',
    type: ApplicationCommandType.User,
} satisfies ApplicationCommandData;
