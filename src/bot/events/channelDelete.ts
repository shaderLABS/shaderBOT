import { Event } from '../eventHandler.js';
import { Channel, TextChannel } from 'discord.js';
import axios from 'axios';
import log from '../../util/log.js';

export const event: Event = {
    name: 'channelDelete',
    callback: async (channel: Channel) => {
        if (!(channel instanceof TextChannel)) return;
        const messages = channel.messages.cache;

        let content = '';
        messages.each((message) => {
            content += `${message.author.username}#${message.author.discriminator}: ${message.content}\n`;
        });

        if (content === '') {
            log(`The channel #${channel.name} has been deleted. There were no cached messages to upload.`);
            return;
        }

        const res = await axios.post('https://hastebin.com/documents', `CACHED MESSAGES OF #${channel.name}\n\n${content}`);

        log(
            `The channel #${channel.name} has been deleted. [${messages.size} cached messages](https://www.hastebin.com/${res.data.key}) have been uploaded.`
        );
    },
};
