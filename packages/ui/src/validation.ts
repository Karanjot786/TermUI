import type { StandardSchemaV1 } from '@standard-schema/spec';

export type InputValidator =
    | StandardSchemaV1
    | ((v: unknown) => string | undefined | null);

export function validateInput(
    validator: InputValidator | undefined,
    value: unknown,
): string | undefined {
    if (!validator) {
        return undefined;
    }

    if (typeof validator === 'function') {
        return validator(value) ?? undefined;
    }

    const result = validator['~standard'].validate(value);

    if (result instanceof Promise) {
        throw new Error('Async validators are not supported');
    }

    if (!result.issues?.length) {
        return undefined;
    }

    return result.issues[0]?.message ?? 'Validation failed';
}