import { Interaction } from 'discord.js';
import { handleAutocomplete } from '../autocompleteHandler.js';
import { handleButton } from '../buttonHandler.js';
import { handleMessageContextMenuCommand } from '../contextMenuHandler.js';
import { Event } from '../eventHandler.js';
import { handleModalSubmit } from '../modalSubmitHandler.js';
import { handleChatInputCommand } from '../slashCommandHandler.js';

export const event: Event = {
    name: 'interactionCreate',
    callback: (interaction: Interaction) => {
        if (!interaction.inCachedGuild()) return;

        if (interaction.isAutocomplete()) return handleAutocomplete(interaction);
        if (interaction.isButton()) return handleButton(interaction);
        if (interaction.isMessageContextMenuCommand()) return handleMessageContextMenuCommand(interaction);
        if (interaction.isModalSubmit()) return handleModalSubmit(interaction);
        if (interaction.isChatInputCommand()) return handleChatInputCommand(interaction);
    },
};
