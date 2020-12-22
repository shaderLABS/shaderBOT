declare module '@polka/redirect' {
    export default function (res: ServerResponse, location?: string);
    export default function (res: ServerResponse, code?: number, location?: string);
}
