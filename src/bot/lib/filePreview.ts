import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, Message, PermissionFlagsBits } from 'discord.js';
import { client, settings } from '../bot.js';
import { GuildMessage } from '../events/message/messageCreate.js';
import { EmbedColor, replyError } from './embeds.js';
import { parseUser, unicodeLineBoundaries } from './misc.js';

const gitHubFileURLs = /https:\/\/github\.com(?:\/[^\/\s]+){2}\/blob(?:\/[^\/\s]+)+#[^\/\s]+/;
const gitHubGistURLs = /https:\/\/gist\.github\.com(?:\/[^\/\s]+){2}#file\-[^\/\s]+/;

// not all properties
type Gist = {
    url: string;
    forks_url: string;
    commits_url: string;
    id: string;
    node_id: string;
    git_pull_url: string;
    git_push_url: string;
    html_url: string;
    files: {
        [filename: string]: {
            filename: string;
            type: string;
            language: string;
            raw_url: string;
            size: number;
            truncated: boolean;
            content: string;
        };
    };
    public: boolean;
    created_at: string;
    updated_at: string;
    description: string;
    comments: number;
    comments_url: string;
    truncated: boolean;
};

export async function checkFilePreview(message: GuildMessage) {
    let rawURLMatch: RegExpMatchArray | null;
    let type: 'file' | 'gist';

    if ((rawURLMatch = message.content.match(gitHubFileURLs))) {
        try {
            var rawURL = new URL(rawURLMatch[0]);
        } catch {
            return;
        }

        const [, author, repository, , branch, ...path] = rawURL.pathname.split('/');
        type = 'file';

        var metadataContent = `**${author}/${repository}** (on ${branch})\n${path.join('/')}`;
        var apiURL = `https://raw.githubusercontent.com/${author}/${repository}/${branch}/${path.join('/')}`;
    } else if ((rawURLMatch = message.content.match(gitHubGistURLs))) {
        try {
            var rawURL = new URL(rawURLMatch[0]);
        } catch {
            return;
        }

        const [, author, id] = rawURL.pathname.split('/');
        type = 'gist';

        var metadataContent = `**${author}**`;
        var apiURL = `https://api.github.com/gists/${id}`;
    } else return;

    const lineNumbers = [...rawURL.hash.matchAll(/L(\d+)/g)];
    if (lineNumbers.length === 0) return;

    let topLineNumber = Math.max(Number(lineNumbers[0][1]), 1);
    let bottomLineNumber = lineNumbers.length === 2 ? Math.max(Number(lineNumbers[1][1]), 1) : topLineNumber;

    if (bottomLineNumber < topLineNumber) {
        [topLineNumber, bottomLineNumber] = [bottomLineNumber, topLineNumber];
    }

    const request = await fetch(apiURL, { method: 'GET', headers: { Accept: type === 'file' ? 'text/plain' : 'application/vnd.github.raw+json' } }).catch(() => undefined);
    if (!request || !request.ok || !request.body) {
        await request?.body?.cancel();
        return;
    }

    // limit file size to 64 KB
    const fileSize = request.headers.get('Content-Length');
    if (!fileSize || Number(fileSize) > 65536) {
        await request.body.cancel();
        return;
    }

    let fileExtension: string;
    let selectedContent: string[];

    if (type === 'file') {
        const file: string | undefined = await request.text().catch(() => undefined);
        if (!file) return;

        selectedContent = file.split(unicodeLineBoundaries).slice(topLineNumber - 1, bottomLineNumber);

        const fileName = rawURL.pathname.substring(rawURL.pathname.lastIndexOf('/') + 1);
        fileExtension = fileName.substring(fileName.lastIndexOf('.') + 1);
    } else if (type === 'gist') {
        const data: Gist | undefined = await request.json().catch(() => undefined);
        if (!data) return;

        const selectedFileMatch = rawURL.hash.match(/file-([a-z\-\d]+)/);
        if (!selectedFileMatch) return;

        const selectedFileName = selectedFileMatch[1].toLowerCase().replace(/[^a-z\d]/g, '');
        const file = Object.values(data.files).find((file) => file.filename.toLowerCase().replace(/[^a-z\d]/g, '') === selectedFileName);
        if (!file) return;

        selectedContent = file.content.split(unicodeLineBoundaries).slice(topLineNumber - 1, bottomLineNumber);
        metadataContent += '\n' + file.filename;

        fileExtension = file.filename.substring(file.filename.lastIndexOf('.') + 1);
    } else return;

    if (selectedContent.length === 0) return;

    const lineNumberLength = Math.ceil(Math.log10(topLineNumber + selectedContent.length));
    const fileContent = selectedContent.reduce((content, line, index) => content + String(index + topLineNumber).padStart(lineNumberLength, ' ') + ' | ' + line + '\n', '');

    const openButton = new ButtonBuilder({
        url: rawURL.href,
        style: ButtonStyle.Link,
        emoji: '🔗',
        label: 'Open',
    });

    const deleteButton = new ButtonBuilder({
        customId: 'deleteFilePreview',
        style: ButtonStyle.Secondary,
        emoji: '🗑️',
    });

    const buttonActionRow = new ActionRowBuilder<ButtonBuilder>({ components: [openButton, deleteButton] });
    fileExtension = additionalAliases[fileExtension] || fileExtension;

    let reply: Message;
    if (fileContent.length + metadataContent.length > 1900 || selectedContent.length > 6) {
        reply = await message.reply({
            content: metadataContent,
            files: [new AttachmentBuilder(Buffer.from(fileContent), { name: 'preview.' + (binarySearchSupportedLanguages(fileExtension) ? fileExtension : 'txt') })],
            components: [buttonActionRow],
        });

        // send as .txt if the original file extension isn't recognized
        if (reply.attachments.first()?.contentType === null) {
            reply.edit({ files: [new AttachmentBuilder(Buffer.from(fileContent), { name: 'preview.txt' })] });
        }
    } else {
        reply = await message.reply({ content: metadataContent + '\n```' + fileExtension + '\n' + fileContent + '```', components: [buttonActionRow] });
    }

    if (!reply.inGuild()) return;
    message.suppressEmbeds();

    reply
        .awaitMessageComponent({
            componentType: ComponentType.Button,
            filter: (buttonInteraction) => {
                if (buttonInteraction.user.id === message.member.id || buttonInteraction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;

                replyError(buttonInteraction, undefined, 'Insufficient Permissions');
                return false;
            },
            time: 300_000, // 5min = 300,000ms
        })
        .then(() => {
            reply.delete().catch(() => undefined);
        })
        .catch(() => {
            deleteButton.setDisabled(true);
            reply.edit({ components: [buttonActionRow] }).catch(() => undefined);
        });

    const logChannel = client.channels.cache.get(settings.data.logging.messageChannelID);
    if (logChannel?.type === ChannelType.GuildText) {
        logChannel.send({
            embeds: [
                new EmbedBuilder({
                    color: EmbedColor.Blue,
                    author: {
                        name: 'File Preview',
                        iconURL: message.author.displayAvatarURL(),
                        url: reply.url,
                    },
                    description: `${parseUser(message.author)} sent a file URL in [their message](${message.url}) (${message.id}). A [preview](${reply.url}) has been rendered.`,
                    footer: {
                        text: `ID: ${reply.id}`,
                    },
                }),
            ],
        });
    }
}

function binarySearchSupportedLanguages(value: string) {
    let start = 0;
    let end = 395; // supportedLanguages.length - 1

    while (start <= end) {
        const middle = (start + end) >> 1;
        const language = supportedLanguages[middle];

        if (language < value) {
            start = middle + 1;
        } else if (language > value) {
            end = middle - 1;
        } else {
            return true;
        }
    }

    return false;
}

const additionalAliases: { [key: string]: string } = {
    vsh: 'glsl',
    fsh: 'glsl',
    gsh: 'glsl',
    csh: 'glsl',
    vert: 'glsl',
    frag: 'glsl',
    inc: 'glsl',
};

// all aliases supported by highlight.js, sorted for binary search
const supportedLanguages = [
    '1c',
    '4d',
    'SAS',
    'abap',
    'abnf',
    'accesslog',
    'actionscript',
    'ada',
    'adoc',
    'alan',
    'angelscript',
    'apache',
    'apacheconf',
    'apex',
    'applescript',
    'arcade',
    'arduino',
    'arm',
    'armasm',
    'as',
    'asc',
    'asciidoc',
    'aspectj',
    'atom',
    'autohotkey',
    'autoit',
    'avrasm',
    'awk',
    'axapta',
    'bash',
    'basic',
    'bat',
    'bbcode',
    'bf',
    'bind',
    'blade',
    'bnf',
    'brainfuck',
    'c',
    'c++',
    'cal',
    'capnp',
    'capnproto',
    'cc',
    'chaos',
    'chapel',
    'chpl',
    'cisco',
    'clj',
    'clojure',
    'cls',
    'cmake',
    'cmake.in',
    'cmd',
    'cobol',
    'coffee',
    'coffeescript',
    'console',
    'coq',
    'cos',
    'cpc',
    'cpp',
    'cr',
    'craftcms',
    'crm',
    'crmsh',
    'crystal',
    'cs',
    'csharp',
    'cshtml',
    'cson',
    'csp',
    'css',
    'curl',
    'cxx',
    'cypher',
    'd',
    'dafny',
    'dart',
    'dfm',
    'diff',
    'django',
    'dns',
    'docker',
    'dockerfile',
    'dos',
    'dpr',
    'dsconfig',
    'dst',
    'dts',
    'dust',
    'dylan',
    'ebnf',
    'elixir',
    'elm',
    'erl',
    'erlang',
    'excel',
    'extempore',
    'f90',
    'f95',
    'fix',
    'fortran',
    'fs',
    'fsharp',
    'gams',
    'gauss',
    'gawk',
    'gcode',
    'gdscript',
    'gemspec',
    'gf',
    'gherkin',
    'glimmer',
    'glsl',
    'gms',
    'gn',
    'gni',
    'go',
    'godot',
    'golang',
    'golo',
    'gololang',
    'gradle',
    'graph',
    'graphql',
    'groovy',
    'gsql',
    'gss',
    'gyp',
    'h',
    'h++',
    'haml',
    'handlebars',
    'haskell',
    'haxe',
    'hbs',
    'hcl',
    'hh',
    'hlsl',
    'hpp',
    'hs',
    'html',
    'html.handlebars',
    'html.hbs',
    'htmlbars',
    'http',
    'https',
    'hx',
    'hxx',
    'hy',
    'hylang',
    'i',
    'i7',
    'iced',
    'iecst',
    'inform7',
    'ini',
    'ino',
    'instances',
    'iol',
    'irb',
    'irpf90',
    'java',
    'javascript',
    'jinja',
    'jolie',
    'js',
    'json',
    'jsp',
    'jsx',
    'julia',
    'julia-repl',
    'k',
    'kaos',
    'kdb',
    'kotlin',
    'kt',
    'lasso',
    'lassoscript',
    'ldif',
    'leaf',
    'lean',
    'less',
    'lisp',
    'livecodeserver',
    'livescript',
    'ln',
    'ls',
    'lua',
    'macaulay2',
    'mak',
    'make',
    'makefile',
    'markdown',
    'mathematica',
    'matlab',
    'mawk',
    'maxima',
    'md',
    'mel',
    'mercury',
    'mirc',
    'mizar',
    'mk',
    'mkb',
    'mkd',
    'mkdown',
    'ml',
    'mlir',
    'mm',
    'mma',
    'mojolicious',
    'monkey',
    'moon',
    'moonscript',
    'mrc',
    'n1ql',
    'nawk',
    'nc',
    'never',
    'nginx',
    'nginxconf',
    'nim',
    'nimrod',
    'nix',
    'nsis',
    'oak',
    'obj-c',
    'obj-c++',
    'objc',
    'objective-c++',
    'objectivec',
    'ocaml',
    'ocl',
    'ol',
    'openscad',
    'osascript',
    'oxygene',
    'p21',
    'papyrus',
    'parser3',
    'pas',
    'pascal',
    'patch',
    'pcmk',
    'perl',
    'pf',
    'pf.conf',
    'pgsql',
    'php',
    'pine',
    'pinescript',
    'pl',
    'plaintext',
    'plist',
    'pm',
    'podspec',
    'pony',
    'postgres',
    'postgresql',
    'powershell',
    'pp',
    'prg',
    'processing',
    'profile',
    'prolog',
    'properties',
    'protobuf',
    'ps',
    'ps1',
    'psc',
    'puppet',
    'py',
    'pycon',
    'python',
    'python-repl',
    'qml',
    'qsharp',
    'r',
    'razor',
    'razor-cshtml',
    'rb',
    're',
    'reasonml',
    'rebol',
    'red',
    'red-system',
    'redbol',
    'rf',
    'rib',
    'risc',
    'riscript',
    'robot',
    'rpm',
    'rpm-spec',
    'rpm-specfile',
    'rs',
    'rsl',
    'rss',
    'ruby',
    'ruleslanguage',
    'rust',
    'sap-abap',
    'sas',
    'sc',
    'scad',
    'scala',
    'scheme',
    'sci',
    'scilab',
    'scl',
    'scss',
    'sh',
    'shell',
    'shexc',
    'smali',
    'smalltalk',
    'sml',
    'sol',
    'solidity',
    'spec',
    'specfile',
    'spl',
    'sql',
    'st',
    'stan',
    'standard-cobol',
    'stanfuncs',
    'stata',
    'step',
    'stl',
    'stp',
    'structured-text',
    'styl',
    'stylus',
    'subunit',
    'supercollider',
    'svelte',
    'svg',
    'swift',
    'tao',
    'tap',
    'tcl',
    'terraform',
    'tex',
    'text',
    'tf',
    'thor',
    'thrift',
    'tk',
    'toit',
    'toml',
    'tp',
    'ts',
    'tsql',
    'twig',
    'txt',
    'typescript',
    'unicorn-rails-log',
    'v',
    'vala',
    'vb',
    'vba',
    'vbnet',
    'vbs',
    'vbscript',
    'verilog',
    'vhdl',
    'vim',
    'wl',
    'x++',
    'x86asm',
    'xhtml',
    'xjb',
    'xl',
    'xls',
    'xlsx',
    'xml',
    'xpath',
    'xq',
    'xquery',
    'xs',
    'xsd',
    'xsharp',
    'xsl',
    'xtlang',
    'xtm',
    'yaml',
    'yml',
    'zenscript',
    'zep',
    'zephir',
    'zone',
    'zs',
    'zsh',
];
