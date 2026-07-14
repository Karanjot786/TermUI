import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * A validator for interactive inputs. Either a Standard Schema (v1) or a
 * function returning an error message (or `undefined`/`null` when valid).
 * May be synchronous or asynchronous.
 */
export type InputValidator =
    | StandardSchemaV1
    | ((v: unknown) => string | undefined | null | Promise<string | undefined | null>);

/**
 * Run `validator` against `value` and return the first error message, or
 * `undefined` when the value is valid.
 *
 * Supports both function validators and Standard Schema validators, including
 * the async (`Promise`) variants of either.
 */
export async function validateInput(
    validator: InputValidator | undefined,
    value: unknown,
): Promise<string | undefined> {
    if (!validator) {
        return undefined;
    }

    if (typeof validator === 'function') {
        const result = validator(value);
        if (result instanceof Promise) {
            return (await result) ?? undefined;
        }
        return result ?? undefined;
    }

    const result = validator['~standard'].validate(value);

    // Resolve the promise if it is async, otherwise use the synchronous result directly
    const resolvedResult = result instanceof Promise ? await result : result;
    const issues = resolvedResult.issues;

    if (!issues?.length) {
        return undefined;
    }

    return issues[0]?.message ?? 'Validation failed';
}
