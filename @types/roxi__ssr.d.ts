declare module '@roxi/ssr' {
    export function ssr(template: string, script: string, url: string, options?: Partial<Config> | undefined): Promise<string>;
    /**
     * Called before/after the app script is evaluated
     */
    export type Eval = (dom: object) => any;
    export type Config = {
        /**
         * hostname to use while rendering. Defaults to http://jsdom.ssr
         */
        host: string;
        /**
         * event to wait for before rendering app. Defaults to 'app-loaded'
         */
        eventName: string;
        /**
         * Executed before script is evaluated.
         */
        beforeEval: Eval;
        /**
         * Executed after script is evaluated.
         */
        afterEval: Eval;
        /**
         * Metadata to be applied to the HTML element. Defaults to { 'data-render': 'ssr' }
         */
        meta: object;
        /**
         * Don't print timestamps
         */
        silent: boolean;
        /**
         * required for apps with dynamic imports
         */
        inlineDynamicImports: boolean;
        /**
         * required for apps with dynamic imports
         */
        timeout: number;
    };
}
