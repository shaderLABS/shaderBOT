import { Collection, CommandInteraction, Guild, GuildMember, Interaction, Message, MessageContextMenuInteraction, TextChannel, ThreadChannel } from 'discord.js';
import { cooldowns, settings } from '../bot.js';
import { Event } from '../eventHandler.js';
import { replyError, replySuccess } from '../lib/embeds.js';
import { isTextOrThreadChannel } from '../lib/misc.js';
import { isProjectOwner } from '../lib/project.js';
import { handleSpamInteraction } from '../lib/spamProtection.js';
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

async function handleMessageContextMenu(interaction: MessageContextMenuInteraction) {
    if (interaction.commandName === 'Pin/Unpin Message') {
        const { targetMessage, channel } = interaction;
        if (!(targetMessage instanceof Message)) return replyError(interaction, 'The message could not be resolved.');
        if (!(channel instanceof TextChannel)) return replyError(interaction, 'The message was not sent in a text channel.');

        if (!(await isProjectOwner(interaction.user.id, channel.id))) return replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
        if (channel.parentId && settings.archive.categoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

        const wasPinned = targetMessage.pinned;

        try {
            if (wasPinned) await targetMessage.unpin();
            else await targetMessage.pin();
        } catch {
            replyError(interaction, wasPinned ? 'Failed to unpin message.' : 'Failed to pin message. You can only pin up to 50 messages.');
        }

        replySuccess(interaction, wasPinned ? 'Successfully unpinned message.' : 'Successfully pinned message.', undefined, true);
    }
}

export const event: Event = {
    name: 'interactionCreate',
    callback: async (interaction: Interaction) => {
        if (interaction.isButton()) return handleSpamInteraction(interaction);
        if (interaction.isMessageContextMenu()) return handleMessageContextMenu(interaction);

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

        const { cooldownDuration = 5000, channelWhitelist, callback } = command;

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
