import { describe, expect, it } from 'vitest'
import { chalkToTermUI, ensureChalkInstalled } from './index.js'

describe('chalk adapter', () => {
 it('passes ANSI strings through when NO_COLOR is not set', () => {
  const originalNoColor = process.env.NO_COLOR

  delete process.env.NO_COLOR

  const input = '\u001B[31merror\u001B[39m'

  expect(chalkToTermUI(input)).toBe(input)

  process.env.NO_COLOR = originalNoColor
})

it('strips ANSI sequences when NO_COLOR is set', () => {
  const originalNoColor = process.env.NO_COLOR

  process.env.NO_COLOR = '1'

  const input = '\u001B[31merror\u001B[39m'

  expect(chalkToTermUI(input)).toBe('error')

  process.env.NO_COLOR = originalNoColor
})

  it('exports chalk dependency guard', () => {
    expect(typeof ensureChalkInstalled).toBe('function')
  })
})