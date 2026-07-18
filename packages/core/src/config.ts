export interface TermUIConfig {
    theme?: string;
    hotReload?: boolean;
    router?: {
        dir?: string;
    };
}

export function defineConfig<T extends TermUIConfig>(config: T): T {
    return config;
}
