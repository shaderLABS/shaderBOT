import { ButtonInteraction } from 'discord.js';
import { handleSpamInteraction } from './lib/spamProtection.js';

export async function handleButton(interaction: ButtonInteraction) {
    if (interaction.customId.startsWith('kickSpam') || interaction.customId.startsWith('forgiveSpam')) {
        handleSpamInteraction(interaction);
    }
}
