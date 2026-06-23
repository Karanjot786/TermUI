import type { StandardSchemaV1 } from '@standard-schema/spec';

export type InputValidator =
    | StandardSchemaV1
    | ((v: unknown) => string | undefined | null | Promise<string | undefined | null>);

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
