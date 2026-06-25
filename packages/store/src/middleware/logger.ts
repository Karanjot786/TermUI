import type { Middleware } from '../store.js';

export interface LoggerOptions {
    /** Log only specific action names */
    actions?: string[];
    /** Customize logging output */
    log?: (message: string) => void;
}

/**
 * Logger middleware for tracking state transitions.
 * Logs the action name, previous state, and next state.
 */
export function logger<T>(options?: LoggerOptions): Middleware<T> {
    const logFn = options?.log ?? console.log;

    return async (prevState, update, next, actionName, abort, set) => {
        const name = actionName || 'anonymous';
        
        if (options?.actions && !options.actions.includes(name)) {
            await next(update, actionName);
            return true;
        }

        const timestamp = new Date().toISOString();
        logFn(`\x1b[36m[${timestamp}]\x1b[0m Action: \x1b[32m${name}\x1b[0m`);
        logFn(`  \x1b[90mPrev:\x1b[0m ${JSON.stringify(prevState)}`);
        logFn(`  \x1b[94mUpdate:\x1b[0m ${JSON.stringify(update)}`);

        // Await next to get the mutated state
        const nextState = await next(update, actionName);

        logFn(`  \x1b[35mNext:\x1b[0m ${JSON.stringify(nextState)}`);
        
        return true;
    };
}
