import fs from 'fs/promises';
import path from 'path';
import { AutoResponse, autoResponsePath } from '../autoResponseHandler.js';
import { Pasta, pastaPath } from '../pastaHandler.js';

export function getStringFromCodeBlock(text: string) {
    const start = text.match(/```[a-z]*/);
    if (!start) return;

    const startIndex = text.indexOf(start[0]);
    if (startIndex === -1) return;

    const endIndex = text.lastIndexOf('```');
    if (endIndex === -1) return;

    return text.substring(startIndex + start[0].length, endIndex);
}

export function stringToFileName(alias: string) {
    return alias.replace(/[^a-z0-9]/gi, '_') + '.json';
}

// PASTA

export async function writePasta(pasta: Pasta) {
    await fs.stat(pastaPath).catch(async (error) => {
        if (error.code === 'ENOENT') await fs.mkdir(pastaPath, { recursive: true });
        else throw error;
    });

    fs.writeFile(path.join(pastaPath, stringToFileName(pasta.alias)), JSON.stringify(pasta, null, 4));
}

// AUTO RESPONSE

export function autoResponseToJSON(autoResponse: AutoResponse): string {
    return JSON.stringify({ ...autoResponse, regex: autoResponse.regex.source }, null, 4);
}

export function JSONToAutoResponse(json: string): AutoResponse {
    let autoResponse = JSON.parse(json);
    return { ...autoResponse, regex: new RegExp(autoResponse.regex) };
}

export async function writeAutoResponse(autoResponse: AutoResponse) {
    await fs.stat(autoResponsePath).catch(async (error) => {
        if (error.code === 'ENOENT') await fs.mkdir(autoResponsePath, { recursive: true });
        else throw error;
    });

    fs.writeFile(path.join(autoResponsePath, stringToFileName(autoResponse.regex.source)), autoResponseToJSON(autoResponse));
}
