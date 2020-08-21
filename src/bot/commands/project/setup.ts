import { Command, syntaxError } from '../../commandHandler.js';
import Project from '../../../db/models/Project.js';
import { Message, TextChannel, MessageEmbed, GuildMember } from 'discord.js';
import mongoose from 'mongoose';
import log from '../../../misc/log.js';

export const command: Command = {
    commands: ['setup'],
    expectedArgs: '<@user|userID> <...>',
    minArgs: 1,
    maxArgs: null,
    superCommand: 'project',
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (message: Message, args: string[]) => {
        const { channel, guild } = message;
        if (!guild || !(channel instanceof TextChannel)) return;
        if (await Project.exists({ channel: channel.id })) return channel.send('This channel is already linked to a project.');

        let owners: GuildMember[] = [];

        const mentionedMembers = message.mentions.members;
        if (mentionedMembers) owners = owners.concat(mentionedMembers.array());

        for (const potentialID of args) {
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
    },
};
