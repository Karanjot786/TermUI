import type { Middleware } from '../store.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

export interface PersistMiddlewareOptions {
    /** Custom key to identify the store, defaults to file name */
    key?: string;
    /** Absolute path or relative path to config directory */
    file?: string;
    /** Debounce writes by ms */
    debounceMs?: number;
}

// ── App Config Directory Resolver ──
function getAppConfigDir(): string {
    const home = os.homedir();
    if (process.platform === 'win32') {
        return process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    }
    if (process.platform === 'darwin') {
        return path.join(home, 'Library', 'Application Support');
    }
    return process.env.XDG_CONFIG_HOME || path.join(home, '.config');
}

/**
 * Persist middleware.
 * Saves state to disk and rehydrates it upon initialization.
 */
export function persist<T>(options: PersistMiddlewareOptions): Middleware<T> {
    const debounceMs = options.debounceMs ?? 100;
    
    let persistFilePath = '';
    if (options.file) {
        persistFilePath = path.isAbsolute(options.file)
            ? options.file
            : path.join(getAppConfigDir(), options.file);
    } else if (options.key) {
        persistFilePath = path.join(getAppConfigDir(), `${options.key}.json`);
    }

    let writeTimeout: NodeJS.Timeout | null = null;
    let initialized = false;

    return (prevState, update, next, actionName, abort, set) => {
        // Hydration intercept: Instead of hacking it into state init,
        // we could intercept the very first update or just read synchronously.
        // Wait, if it's middleware, how do we hydrate the initial state?
        // Since middleware runs on updates, we can't easily hijack initial load.
        // Actually, we CAN hijack the very first middleware call if the user dispatches an INIT action,
        // but state is accessed before any dispatch.
        // For synchronous hydration, we can't easily do it inside the middleware return function
        // because middleware only fires on setState.
        
        // As a workaround, we read synchronously during middleware SETUP (once per store creation)
        // Wait, middleware setup has no access to the store's state or `setState` unless we return a function.
        // Actually, we can mutate `prevState` or `update` if it's the very first action, 
        // but it's better to provide an explicit `rehydrate` method or just do it in the store.
        
        // A cleaner way is to read the file synchronously when the middleware is attached 
        // (which happens inside `createStore`) and return the hydrated data merged with `update`.
        // Wait, middleware is attached during `dispatch(0, nextPartial)`.
        
        if (!initialized && persistFilePath) {
            initialized = true;
            try {
                if (fs.existsSync(persistFilePath)) {
                    const content = fs.readFileSync(persistFilePath, 'utf8');
                    const saved = JSON.parse(content);
                    // Merge saved into update
                    Object.assign(update, saved);
                }
            } catch (err) {
                // Ignore rehydration errors
            }
        }

        const res = next(update, actionName);

        if (persistFilePath) {
            if (writeTimeout) clearTimeout(writeTimeout);
            writeTimeout = setTimeout(() => {
                try {
                    const dir = path.dirname(persistFilePath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    
                    // We must persist the full resolved state.
                    // Since middleware doesn't easily get the full next state without `await next`,
                    // we can use the `res` if it's synchronous.
                    // Wait, `next(update)` returns the next state!
                    const doWrite = (stateObj: any) => {
                        const dataToSave: Record<string, unknown> = {};
                        for (const [key, val] of Object.entries(stateObj)) {
                            if (typeof val !== 'function') dataToSave[key] = val;
                        }
                        fs.writeFileSync(persistFilePath, JSON.stringify(dataToSave), 'utf8');
                    };

                    if (res && typeof (res as any).then === 'function') {
                        (res as Promise<T>).then(doWrite);
                    } else {
                        doWrite(res);
                    }
                } catch (err) {
                    // Ignore write errors
                }
            }, debounceMs);
        }

        return true;
    };
}
