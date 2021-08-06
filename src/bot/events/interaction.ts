import { Collection, Interaction } from 'discord.js';
import { Event } from '../eventHandler.js';
import { slashCommands } from '../slashCommandHandler.js';

export const event: Event = {
    name: 'interaction',
    callback: async (interaction: Interaction) => {
        if (!interaction.isCommand()) return;

        let command = slashCommands.get(interaction.commandName);

        while (command instanceof Collection) {
            const subcommand = interaction.options.first();
            if (subcommand) {
                command = command.get(subcommand.name);
                interaction.options = subcommand.options || new Collection();
            } else {
                break;
            }
        }

        if (command && !(command instanceof Collection)) command.callback(interaction);
    },
};
