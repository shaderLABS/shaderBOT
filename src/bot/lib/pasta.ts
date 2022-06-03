import { Attachment, EmbedBuilder, EmbedData } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { pastaPath } from '../pastaHandler.js';
import { GuildCommandInteraction } from '../slashCommandHandler.js';
import { stringToFileName } from './misc.js';

type PastaData = {
    alias: string;
    content?: string;
    embedData?: EmbedData;
    attachmentURLs?: string[];
};

export class Pasta {
    public alias: string;

    public content?: string;
    public embedData?: EmbedData;
    public attachmentURLs?: string[];

    private embeds?: EmbedBuilder[];
    private attachments: Attachment[];

    constructor(data: PastaData) {
        this.alias = data.alias;

        this.content = data.content;
        this.embedData = data.embedData;
        this.attachmentURLs = data.attachmentURLs;

        this.embeds = data.embedData ? [new EmbedBuilder(data.embedData)] : undefined;
        this.attachments = data.attachmentURLs ? data.attachmentURLs.map((url) => new Attachment(url)) : [];
    }

    public static fromJSON(json: string) {
        return new Pasta(JSON.parse(json));
    }

    public toData(): PastaData {
        return {
            alias: this.alias,
            content: this.content,
            embedData: this.embedData,
            attachmentURLs: this.attachmentURLs,
        };
    }

    public toJSON() {
        return JSON.stringify(this.toData(), null, 4);
    }

    public getFileName() {
        return stringToFileName(this.alias);
    }

    public async save() {
        await fs.stat(pastaPath).catch(async (error) => {
            if (error.code === 'ENOENT') await fs.mkdir(pastaPath, { recursive: true });
            else throw error;
        });

        fs.writeFile(path.join(pastaPath, this.getFileName()), this.toJSON());
    }

    public async reply(interaction: GuildCommandInteraction) {
        return interaction.reply({ content: this.content, embeds: this.embeds, files: this.attachments });
    }
}
