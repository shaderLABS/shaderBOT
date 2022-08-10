import { ApplicationCommandType, ComponentType, Interaction, InteractionType } from 'discord.js';
import { handleAutocomplete } from '../autocompleteHandler.js';
import { handleButton } from '../buttonHandler.js';
import { handleMessageContextMenuCommand, handleUserContextMenuCommand } from '../contextMenuCommandHandler.js';
import { Event } from '../eventHandler.js';
import { handleModalSubmit } from '../modalSubmitHandler.js';
import { handleChatInputCommand } from '../slashCommandHandler.js';

export const event: Event = {
    name: 'interactionCreate',
    callback: (interaction: Interaction) => {
        if (!interaction.inCachedGuild()) return;

        if (interaction.type === InteractionType.ApplicationCommandAutocomplete) return handleAutocomplete(interaction);
        if (interaction.type === InteractionType.ApplicationCommand) {
            if (interaction.commandType === ApplicationCommandType.ChatInput) return handleChatInputCommand(interaction);
            if (interaction.commandType === ApplicationCommandType.Message) return handleMessageContextMenuCommand(interaction);
            if (interaction.commandType === ApplicationCommandType.User) return handleUserContextMenuCommand(interaction);
        }
        if (interaction.type === InteractionType.MessageComponent) {
            if (interaction.componentType === ComponentType.Button) return handleButton(interaction);
        }
        if (interaction.type === InteractionType.ModalSubmit) return handleModalSubmit(interaction);
    },
};
