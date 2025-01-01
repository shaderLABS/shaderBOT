import { Collection, ModalSubmitInteraction } from 'discord.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

export type ModalSubmitCallback = {
    readonly customID: string;
    readonly callback: (interaction: ModalSubmitInteraction<'cached'>, state: string | undefined) => void;
};

const modals = new Collection<string, ModalSubmitCallback>();

/***********
 * EXECUTE *
 ***********/

export async function handleModalSubmit(interaction: ModalSubmitInteraction<'cached'>) {
    const [customId, state] = interaction.customId.split(':');

    const modal = modals.get(customId);
    if (modal) modal.callback(interaction, state);
}

/************
 * REGISTER *
 ************/

export async function registerModals(dir: string, directories: string[] = []) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });

    await Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (dirEntry.isDirectory()) {
                await registerModals(path.join(dir, dirEntry.name), [...directories, dirEntry.name]);
            } else if (dirEntry.name.endsWith('.ts')) {
                const { modal }: { modal: ModalSubmitCallback } = await import(url.pathToFileURL(path.join(dirPath, dirEntry.name)).href);
                modals.set(modal.customID, modal);
            }
        }),
    );
}
