import type { ZodType } from 'zod'

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
