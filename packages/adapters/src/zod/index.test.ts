import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { zodValidator } from './index.js'

describe('zodValidator', () => {
  it('returns true for a valid value', () => {
    const schema = z.string().min(3)
    const validator = zodValidator(schema)

    const result = validator('hello')

    expect(result).toBe(true)
  })

  it('returns the first error message for an invalid value', () => {
    const schema = z.string().min(5, 'Must be at least 5 characters')
    const validator = zodValidator(schema)

    const result = validator('abc')

    expect(result).toBe('Must be at least 5 characters')
  })

  it('does not throw on invalid input', () => {
    const schema = z.string().email('Invalid email')
    const validator = zodValidator(schema)

    expect(() => {
      validator('not-an-email')
    }).not.toThrow()
  })

  it('works with a refined schema', () => {
    const schema = z.string().refine(
      (value) => value !== 'forbidden',
      'This value is not allowed'
    )
    const validator = zodValidator(schema)

    expect(validator('allowed')).toBe(true)
    expect(validator('forbidden')).toBe('This value is not allowed')
  })
})
