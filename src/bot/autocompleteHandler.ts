import { AutocompleteInteraction } from 'discord.js';
import { handlePastaAutocomplete } from './lib/pasta.js';

export async function handleAutocomplete(interaction: AutocompleteInteraction<'cached'>) {
    if (interaction.commandName === 'pasta') {
        handlePastaAutocomplete(interaction);
    }
}
