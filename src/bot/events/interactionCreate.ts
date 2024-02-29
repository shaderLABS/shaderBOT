import { ApplicationCommandType, ComponentType, Events, InteractionType } from 'discord.js';
import { handleAutocomplete } from '../autocompleteHandler.ts';
import { handleButton } from '../buttonHandler.ts';
import { handleChatInputCommand } from '../chatInputCommandHandler.ts';
import { handleMessageContextMenuCommand, handleUserContextMenuCommand } from '../contextMenuCommandHandler.ts';
import type { Event } from '../eventHandler.ts';
import { handleModalSubmit } from '../modalSubmitHandler.ts';

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
