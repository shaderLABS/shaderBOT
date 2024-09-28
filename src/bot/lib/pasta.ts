import { AttachmentBuilder, AutocompleteInteraction, CommandInteraction, EmbedBuilder, type EmbedData } from 'discord.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pastaPath, pastaStore } from '../pastaHandler.ts';
import { stringToFileName } from './misc.ts';

type PastaData = {
    alias: string;
    content?: string;
    embedData?: EmbedData;
    attachmentURLs?: string[];
};

export function handlePastaAutocomplete(interaction: AutocompleteInteraction<'cached'>) {
    const value = `${interaction.options.getFocused()}`;
    const filtered = pastaStore.filter(
        (pasta) =>
            pasta.alias.includes(value) ||
            pasta.content?.includes(value) ||
            (pasta.embedData &&
                (pasta.embedData.description?.includes(value) || pasta.embedData.footer?.text.includes(value) || pasta.embedData.fields?.some((field) => field.value.includes(value)))) ||
            false
    );
    interaction.respond(filtered.map((_, alias) => ({ name: alias, value: alias })));
}

export class Pasta {
    public alias: string;

    public content?: string;
    public embedData?: EmbedData;
    public attachmentURLs?: string[];

    private embeds?: EmbedBuilder[];
    private attachments: AttachmentBuilder[];

    constructor(data: PastaData) {
        this.alias = data.alias;

        this.content = data.content;
        this.embedData = data.embedData;
        this.attachmentURLs = data.attachmentURLs;

        this.embeds = data.embedData ? [new EmbedBuilder(data.embedData)] : undefined;
        this.attachments = data.attachmentURLs ? data.attachmentURLs.map((url) => new AttachmentBuilder(url)) : [];
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
        return JSON.stringify(this.toData(), null, '\t');
    }

    public getFileName() {
        return stringToFileName(this.alias);
    }

    public async save() {
        await Bun.write(path.join(pastaPath, this.getFileName()), this.toJSON(), { createPath: true });
    }

    public async delete() {
        await fs.rm(path.join(pastaPath, this.getFileName()));
    }

    public async reply(interaction: CommandInteraction) {
        return interaction.reply({ content: this.content, embeds: this.embeds, files: this.attachments });
    }
}
