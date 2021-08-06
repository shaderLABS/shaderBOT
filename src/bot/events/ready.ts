import { GuildApplicationCommandPermissionData } from 'discord.js';
import { client } from '../bot.js';
import { Event } from '../eventHandler.js';
import { getGuild } from '../lib/misc.js';
import { loadTimeouts } from '../lib/punishments.js';
import { registerSlashCommands, slashCommandStructure } from '../slashCommandHandler.js';

export const event: Event = {
    name: 'ready',
    callback: async () => {
        if (!client.user) return console.error('Failed to login.');
        console.log(`Logged in as '${client.user.tag}'.`);

        loadTimeouts(false);

        const guild = getGuild();
        if (!guild) return;

        await registerSlashCommands('./src/bot/slashCommands');
        await guild.commands.set(slashCommandStructure);

        const commands = await guild.commands.fetch();
        const permissions: GuildApplicationCommandPermissionData[] = [];

        slashCommandStructure.forEach((structure) => {
            if (!structure.permissions) return;

            const id = commands.find((value) => value.name === structure.name)?.id;
            if (!id) return;

            permissions.push({ id, permissions: structure.permissions });
        });

        guild.commands.setPermissions(permissions);

        // getGuild()?.commands.set([
        //     command,
        //     {
        //         name: 'ban',
        //         description: 'Ban a user.',
        //         defaultPermission: false,
        //         options: [
        //             {
        //                 name: 'user',
        //                 description: 'The user which you want to ban.',
        //                 type: 'USER',
        //                 required: true,
        //             },
        //             {
        //                 name: 'reason',
        //                 description: 'The reason for the ban.',
        //                 type: 'STRING',
        //                 required: true,
        //             },
        //             {
        //                 name: 'delete',
        //                 description: 'If true, all messages sent in the past 7 days will be deleted.',
        //                 type: 'BOOLEAN',
        //                 required: false,
        //             },
        //         ],
        //     },
        //     {
        //         name: 'warn',
        //         description: 'Manage the warnings of an user.',
        //         options: [
        //             {
        //                 name: 'create',
        //                 description: 'Create a new warning.',
        //                 type: 'SUB_COMMAND',
        //                 options: [
        //                     {
        //                         name: 'user',
        //                         description: 'The user receiving the warning.',
        //                         type: 'USER',
        //                         required: true,
        //                     },
        //                     {
        //                         name: 'severity',
        //                         description: 'The severity of the warning.',
        //                         type: 'INTEGER',
        //                         required: true,
        //                         choices: [
        //                             {
        //                                 name: '0',
        //                                 value: 0,
        //                             },
        //                             {
        //                                 name: '1',
        //                                 value: 1,
        //                             },
        //                             {
        //                                 name: '2',
        //                                 value: 2,
        //                             },
        //                             {
        //                                 name: '3',
        //                                 value: 3,
        //                             },
        //                         ],
        //                     },
        //                     {
        //                         name: 'reason',
        //                         description: 'The reason of the warning.',
        //                         type: 'STRING',
        //                         required: false,
        //                     },
        //                 ],
        //             },
        //             {
        //                 name: 'delete',
        //                 description: 'Delete an existing warning.',
        //                 type: 'SUB_COMMAND_GROUP',
        //                 options: [
        //                     {
        //                         name: 'user',
        //                         description: 'Delete the last warning of a user.',
        //                         type: 'SUB_COMMAND',
        //                         options: [
        //                             {
        //                                 name: 'user',
        //                                 description: 'The user you want to delete the last warning of.',
        //                                 type: 'USER',
        //                                 required: true,
        //                             },
        //                         ],
        //                     },
        //                     {
        //                         name: 'id',
        //                         description: 'Delete a warning with the specified UUID.',
        //                         type: 'SUB_COMMAND',
        //                         options: [
        //                             {
        //                                 name: 'id',
        //                                 description: 'The UUID of the warning.',
        //                                 type: 'STRING',
        //                                 required: true,
        //                             },
        //                         ],
        //                     },
        //                 ],
        //             },
        //             {
        //                 name: 'list',
        //                 description: "List another user's warnings.",
        //                 type: 'SUB_COMMAND',
        //                 options: [
        //                     {
        //                         name: 'user',
        //                         description: 'The user you want to list the warnings of.',
        //                         type: 'USER',
        //                         required: true,
        //                     },
        //                 ],
        //             },
        //             {
        //                 name: 'trigger',
        //                 description: 'Trigger the automatic punishment system for the specified user.',
        //                 type: 'SUB_COMMAND',
        //                 options: [
        //                     {
        //                         name: 'user',
        //                         description: 'The user you want to trigger the automatic punishment system for.',
        //                         type: 'USER',
        //                         required: true,
        //                     },
        //                 ],
        //             },
        //         ],
        //     },
        // ]);
    },
};
