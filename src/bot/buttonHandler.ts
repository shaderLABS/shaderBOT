import { ButtonInteraction } from 'discord.js';
import { handleJuxtaposeRefreshInteraction } from './lib/juxtapose.js';
import { handleSpamInteraction } from './lib/spamProtection.js';

/***********
 * EXECUTE *
 ***********/

export async function handleButton(interaction: ButtonInteraction<'cached'>) {
    if (interaction.customId.startsWith('kickSpam') || interaction.customId.startsWith('forgiveSpam')) {
        handleSpamInteraction(interaction);
    } else if (interaction.customId.startsWith('refreshJuxtapose')) {
        handleJuxtaposeRefreshInteraction(interaction);
    }
}
