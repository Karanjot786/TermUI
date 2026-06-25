import type { Middleware } from '../store.js';

export interface ValidatorOptions<T> {
    /** 
     * A validation function that throws an error or returns false if invalid.
     * Compatible with Zod schemas e.g. `schema.parse`
     */
    validate: (state: T) => any;
    /** Whether to log validation errors. Default is true */
    logErrors?: boolean;
}

/**
 * Validator middleware.
 * Intercepts updates and validates the projected next state.
 * Aborts the update if validation fails.
 */
export function validator<T>(options: ValidatorOptions<T>): Middleware<T> {
    const logErrors = options.logErrors ?? true;

    return (prevState, update, next, actionName, abort, set) => {
        // Calculate the projected next state
        const nextState = { ...prevState, ...update };

        try {
            const result = options.validate(nextState);
            if (result === false) {
                if (logErrors) console.error(`[Validator] State validation failed for action: ${actionName}`);
                abort();
                return false;
            }
        } catch (err) {
            if (logErrors) {
                console.error(`[Validator] State validation error for action: ${actionName}`);
                console.error(err);
            }
            abort();
            return false;
        }

        return next(update, actionName) as any;
    };
}
