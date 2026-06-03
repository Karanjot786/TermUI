import { describe, expect, it } from 'vitest'
import { chalkToTermUI, ensureChalkInstalled } from './index.js'

describe('chalk adapter', () => {
  it('passes ANSI strings through when NO_COLOR is not set', () => {
    delete process.env.NO_COLOR

    const input = '\u001B[31merror\u001B[39m'

    expect(chalkToTermUI(input)).toBe(input)
  })

  it('strips ANSI sequences when NO_COLOR is set', () => {
    process.env.NO_COLOR = '1'

    const input = '\u001B[31merror\u001B[39m'

    expect(chalkToTermUI(input)).toBe('error')

    delete process.env.NO_COLOR
  })

  it('exports chalk dependency guard', () => {
    expect(typeof ensureChalkInstalled).toBe('function')
  })
})