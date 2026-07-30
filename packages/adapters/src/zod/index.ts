import type { ZodType } from 'zod'
// Issue #3151: [bug]   fix(widgets): `StatusMessage` offset and message truncation overflow for double-wi

export type PromptValidator = (value: string) => true | string

export function zodValidator(schema: ZodType): PromptValidator {
  return (value: string): true | string => {
    const result = schema.safeParse(value)

    if (result.success) {
      return true
    }

    const firstIssue = result.error.issues[0]
    return firstIssue?.message ?? 'Validation failed'
  }
}
