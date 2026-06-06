// ─────────────────────────────────────────────────────
// @termuijs/router — Parameter Validation
// ─────────────────────────────────────────────────────

export type ValidatorFn = (value: string | undefined) => boolean;

export interface ParamSchema {
    [paramName: string]: ValidatorFn;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Validates extracted route parameters against a defined schema.
 * * @param params The extracted route parameters.
 * @param schema The schema containing validation rules for specific parameters.
 * @returns A ValidationResult indicating success and any error messages.
 */
export function validateParams(params: Record<string, string | undefined>, schema: ParamSchema): ValidationResult {
    const errors: string[] = [];

    for (const [key, validator] of Object.entries(schema)) {
        const value = params[key];
        if (!validator(value)) {
            errors.push(`Invalid parameter: '${key}' with value '${value}'`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Built-in validators for common routing scenarios.
 */
export const validators = {
    /** Requires the parameter to be a non-empty string */
    string: (): ValidatorFn => (val) => typeof val === 'string' && val.trim().length > 0,
    
    /** Requires the parameter to be a valid number */
    number: (): ValidatorFn => (val) => val !== undefined && val !== '' && !isNaN(Number(val)),
    
    /** Requires the parameter to match standard UUID format */
    uuid: (): ValidatorFn => (val) => {
        if (!val) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(val);
    },
    
    /** Requires the parameter to exactly match one of the allowed values */
    enum: (allowedValues: string[]): ValidatorFn => (val) => val !== undefined && allowedValues.includes(val)
};