import { ActivitiesOptions, ActivityType } from 'discord.js';
import { client } from '../bot.js';

const activities: ActivitiesOptions[] = [
    {
        type: ActivityType.Playing,
        name: 'with Focal VK.',
    },
    {
        type: ActivityType.Playing,
        name: 'at 64 chunks.',
    },
    {
        type: ActivityType.Playing,
        name: 'at 10 FPS.',
    },
    {
        type: ActivityType.Playing,
        name: 'with V-Sync.',
    },
    {
        type: ActivityType.Playing,
        name: 'Minecraft 2.0',
    },
    {
        type: ActivityType.Playing,
        name: 'with Zera Warp Shaders.',
    },
    {
        type: ActivityType.Playing,
        name: 'with SOOS.',
    },
    {
        type: ActivityType.Watching,
        name: 'rays being traced.',
    },
    {
        type: ActivityType.Watching,
        name: 'dropped frames.',
    },
    {
        type: ActivityType.Watching,
        name: 'slide shows.',
    },
    {
        type: ActivityType.Watching,
        name: 'you.',
    },
    {
        type: ActivityType.Watching,
        name: 'integrated GPUs burn.',
    },
    {
        type: ActivityType.Competing,
        name: 'screenshot contests.',
    },
    {
        type: ActivityType.Listening,
        name: 'staff members.',
    },
];

export function setRandomPresence() {
    client.user?.presence.set({ activities: [activities[(Math.random() * activities.length) | 0]] });
}
