import { Command, syntaxError } from '../commandHandler.js';
import Project from '../../db/models/Project.js';
import { Message, TextChannel, MessageEmbed, GuildMember } from 'discord.js';
import mongoose from 'mongoose';
import log from '../../misc/log.js';

const expectedArgs = '<ping|setup|delete>';

export const command: Command = {
    commands: ['project'],
    minArgs: 1,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: (message, args) => {
        switch (args[0]) {
            case 'setup':
                setupProject(message, args);
                break;
            case 'delete':
                deleteProject(message);
                break;
            case 'ping':
                pingProject(message);
                break;
            default:
                syntaxError(message.channel, 'project ' + expectedArgs);
                break;
        }
    },
};

async function setupProject(message: Message, args: string[]) {
    const { channel, guild } = message;
    if (!guild || !(channel instanceof TextChannel)) return;
    if (!args[1]) return syntaxError(channel, 'project setup <@user|userID> <...>');
    if (await Project.exists({ channel: channel.id })) return channel.send('This channel is already linked to a project.');

    let owners: GuildMember[] = [];

    const mentionedMembers = message.mentions.members;
    if (mentionedMembers) owners = owners.concat(mentionedMembers.array());

    for (const potentialID of args.slice(1)) {
        if (!isNaN(Number(potentialID))) {
            const user = await guild.members.fetch(potentialID);
            if (user) owners.push(user);
        }
    }

    if (owners.length === 0) return syntaxError(channel, 'project setup <@user|userID> <...>');

    for (const owner of owners) {
        channel.createOverwrite(owner, {
            MANAGE_MESSAGES: true,
            MANAGE_CHANNELS: true,
            MANAGE_EMOJIS: true,
        });
    }

    const pingRole = await guild.roles.create({
        data: {
            name: `${channel.name}`,
            mentionable: false,
        },
        reason: `Create notification role for #${channel.name}.`,
    });

    const projectID = new mongoose.Types.ObjectId();

    await Project.create({
        _id: projectID,
        channel: channel.id,
        owners: owners.map((owner) => owner.id),
        pingRole: pingRole.id,
    });

    channel.send(
        new MessageEmbed()
            .setAuthor(channel.name)
            .setFooter('ID: ' + projectID)
            .setColor('#00ff00')
            .addFields([
                {
                    name: owners.length > 1 ? 'Owners' : 'Owner',
                    value: owners.map((owner) => owner.user.username).join(', '),
                },
                {
                    name: 'Notification Role',
                    value: '<@&' + pingRole.id + '>',
                },
            ])
    );
    log('Created project linked to <#' + channel.id + '>.');
}

async function deleteProject(message: Message) {
    const { channel } = message;
    if (!(channel instanceof TextChannel)) return;

    const deleted = await Project.findOne({ channel: channel.id });
    if (!deleted) return channel.send('No project has been set up for this channel.');

    const role = await channel.guild.roles.fetch(deleted.pingRole);
    if (role) role.delete();

    await deleted.deleteOne();

    channel.send('Deleted the project and role linked to this channel.');
    log('Deleted the project and role linked to <#' + channel.id + '>.');
}

async function pingProject(message: Message) {
    const { channel } = message;

    const project = await Project.findOne({ channel: channel.id });
    if (!project) return;
    if (!project.owners?.includes(message.author.id)) return;

    channel.send('<@&' + project.pingRole + '>');
}
