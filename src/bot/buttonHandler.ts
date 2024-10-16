import { ButtonInteraction } from 'discord.js';
import { handleSpamInteraction } from './lib/spamProtection.ts';

/***********
 * EXECUTE *
 ***********/

export async function handleButton(interaction: ButtonInteraction<'cached'>) {
    if (interaction.customId.startsWith('kickSpam') || interaction.customId.startsWith('forgiveSpam')) {
        handleSpamInteraction(interaction);
    }
}
