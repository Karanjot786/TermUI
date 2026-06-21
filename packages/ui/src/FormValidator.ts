export type ValidationRule = 'required' | 'email' | `min:${number}`;

export type ValidationSchema = Record<string, ValidationRule[]>;

export interface ValidationResult {
    valid: boolean;
    errors: Record<string, string[]>;
}

export function createValidator(schema: ValidationSchema) {
    return {
        validate(values: Record<string, string>): ValidationResult {
            const errors: Record<string, string[]> = {};

            for (const field in schema) {
                const value = values[field] ?? '';

                for (const rule of schema[field]) {
                    if (rule === 'required' && !value.trim()) {
                        (errors[field] ??= []).push(`${field} is required`);
                    } else if (rule === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        (errors[field] ??= []).push('Invalid email address');
                    } else if (rule.startsWith('min:')) {
                        const min = Number(rule.slice(4));
                        if (value.length < min) {
                            (errors[field] ??= []).push(`${field} must be at least ${min} characters`);
                        }
                    }
                }
            }

            return { valid: Object.keys(errors).length === 0, errors };
        },
    };
}
