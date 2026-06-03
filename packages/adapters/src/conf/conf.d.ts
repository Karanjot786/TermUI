declare module 'conf' {
    export interface Options<T extends Record<string, unknown> = Record<string, unknown>> {
        cwd?: string;
        configName?: string;
        defaults?: T;
    }

    export default class Conf<T extends Record<string, unknown> = Record<string, unknown>> {
        constructor(options?: Readonly<Partial<Options<T>>>);
        store: T;
    }
}
