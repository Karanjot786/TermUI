import type { Middleware } from '../store.js';

export interface LoggerOptions {
    /** Log only specific action names */
    actions?: string[];
    /**
     * Customize the log sink. Defaults to process.stderr.write (ANSI-formatted).
     * Accepts the same signature as process.stderr.write to keep console out of source.
     */
    log?: (message: string) => void;
}

/**
 * Logger middleware for tracking state transitions.
 * Logs the action name, previous state, and next state to stderr.
 * Pass `log` in options to redirect output (e.g. to a file sink).
 */
export function logger<T>(options?: LoggerOptions): Middleware<T> {
    // Default to stderr; `console` is not allowed in TermUI source.
    const logFn = options?.log ?? ((msg: string) => process.stderr.write(msg + '\n'));

    return async (prevState, update, next, actionName) => {
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
