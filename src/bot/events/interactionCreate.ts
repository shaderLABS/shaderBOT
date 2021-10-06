import { Collection, CommandInteraction, Guild, GuildMember, Interaction, TextChannel, ThreadChannel } from 'discord.js';
import { cooldowns } from '../bot.js';
import { Event } from '../eventHandler.js';
import { replyError } from '../lib/embeds.js';
import { isTextOrThreadChannel } from '../lib/misc.js';
import { ApplicationCommandCallback, slashCommands } from '../slashCommandHandler.js';

export interface GuildCommandInteraction extends CommandInteraction {
    channel: TextChannel | ThreadChannel;
    guild: Guild;
    member: GuildMember;
}

function isGuildInteraction(interaction: Interaction): interaction is GuildCommandInteraction {
    return !!interaction.channel && isTextOrThreadChannel(interaction.channel) && !!interaction.guild && !!interaction.member;
}

function hasPermissions(member: GuildMember, channel: TextChannel | ThreadChannel, command: ApplicationCommandCallback): boolean {
    if (command.requiredPermissions) {
        if (command.permissionOverwrites === true) {
            if (command.requiredPermissions.some((permission) => !member.permissionsIn(channel).has(permission))) return false;
        } else {
            if (command.requiredPermissions.some((permission) => !member.permissions.has(permission))) return false;
        }
    }

    return true;
}

export const event: Event = {
    name: 'interactionCreate',
    callback: async (interaction: Interaction) => {
        if (!interaction.isCommand() || !isGuildInteraction(interaction)) return;

        let command = slashCommands.get(interaction.commandName);
        if (!command) return;

        const subcommandGroup = interaction.options.getSubcommandGroup(false);
        if (command instanceof Collection && subcommandGroup) command = command.get(subcommandGroup);

        const subcommand = interaction.options.getSubcommand(false);
        if (command instanceof Collection && subcommand) command = command.get(subcommand);

        if (!command || command instanceof Collection) return;

        const { channel, member } = interaction;

        /******************
         * CHECK COOLDOWN *
         ******************/

        const cooldownID = `${member.id}:${interaction.commandName}`;
        const currentCooldown = cooldowns.get(cooldownID);
        if (currentCooldown !== undefined) {
            if (!currentCooldown) {
                replyError(interaction, 'Please wait a few seconds.');
            }
            return;
        }

        /************************************
         * VALIDATE COMMAND AND PERMISSIONS *
         ************************************/

        const { cooldownDuration = 5000, channelWhitelist, ticketChannels = false, callback } = command;

        if (!hasPermissions(member, channel, command)) {
            return replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
        }

        if (channelWhitelist && !channelWhitelist.includes(channel.id)) {
            return replyError(interaction, `This command is only usable in <#${channelWhitelist.join('>, <#')}>.`, 'Invalid Channel');
        }

        /****************
         * SET COOLDOWN *
         ****************/

        setTimeout(() => cooldowns.delete(cooldownID), cooldownDuration);
        cooldowns.set(cooldownID, false);

        callback(interaction);
    },
};
