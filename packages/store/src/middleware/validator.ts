import type { Middleware, NextMiddleware } from '../store.js';

export interface ValidatorOptions<T> {
    /**
     * A validation function that throws an error or returns false if invalid.
     * Compatible with Zod schemas e.g. `schema.parse`.
     * Returns `any` to allow broad compatibility (boolean, void, Zod result). // any: validator can be boolean, void, or a Zod parsed result
     */
    validate: (state: T) => any; // any: allows Zod/boolean/void validators without coupling to a specific schema library
    /** Whether to log validation errors to stderr. Default is true */
    logErrors?: boolean;
}

/**
 * Validator middleware.
 * Intercepts updates and validates the projected next state.
 * Aborts the update if validation fails. Errors are written to process.stderr.
 */
export function validator<T>(options: ValidatorOptions<T>): Middleware<T> {
    const logErrors = options.logErrors ?? true;
    // Route through stderr — `console.*` is not allowed in TermUI source.
    const errFn = (msg: string) => process.stderr.write(msg + '\n');

    return (prevState, update, next: NextMiddleware<T>, actionName, abort) => {
        // Calculate the projected next state
        const nextState = { ...prevState, ...update };

        try {
            const result = options.validate(nextState);
            if (result === false) {
                if (logErrors) errFn(`[Validator] State validation failed for action: ${actionName}`);
                abort();
                return false;
            }
        } catch (err) {
            if (logErrors) {
                errFn(`[Validator] State validation error for action: ${actionName}`);
                errFn(String(err));
            }
            abort();
            return false;
        }

        // Middleware return union is boolean|void|Promise<...>; `next` returns T|Promise<T>.
        // The store's dispatch loop treats any non-false truthy value as "proceed", so this is safe.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return next(update, actionName) as any;
    };
}
