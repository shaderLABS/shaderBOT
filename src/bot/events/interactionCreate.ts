import { ApplicationCommandType, ComponentType, Events, InteractionType } from 'discord.js';
import { handleAutocomplete } from '../autocompleteHandler.js';
import { handleButton } from '../buttonHandler.js';
import { handleChatInputCommand } from '../chatInputCommandHandler.js';
import { handleMessageContextMenuCommand, handleUserContextMenuCommand } from '../contextMenuCommandHandler.js';
import { Event } from '../eventHandler.js';
import { handleModalSubmit } from '../modalSubmitHandler.js';

export const event: Event = {
    name: Events.InteractionCreate,
    callback: (interaction) => {
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
