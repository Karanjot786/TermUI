export type ValidationRule =
  | "required"
  | "email"
  | `min:${number}`;

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
        const rules = schema[field];
        const value = values[field] || "";

        for (const rule of rules) {
          if (rule === "required" && !value.trim()) {
            errors[field] ??= [];
            errors[field].push(`${field} is required`);
          }

          if (
            rule === "email" &&
            value &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ) {
            errors[field] ??= [];
            errors[field].push("Invalid email address");
          }

          if (rule.startsWith("min:")) {
            const length = Number(rule.split(":")[1]);

            if (value.length < length) {
              errors[field] ??= [];
              errors[field].push(
                `${field} must be at least ${length} characters`
              );
            }
          }
        }
      }

      return {
        valid: Object.keys(errors).length === 0,
        errors,
      };
    },
  };
}
