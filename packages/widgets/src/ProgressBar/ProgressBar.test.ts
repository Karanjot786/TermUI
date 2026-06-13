import { describe, it, expect } from 'vitest'
import { ProgressString } from './ProgressBar'

describe('ProgressString', () => {
  it('renders 0% with no filled chars', () => {
    const o = ProgressString.render({ value: 0, width: 10, style: 'blocks' })
    expect(o).not.toContain('█')
  })
  it('renders 100% with no empty chars', () => {
    const o = ProgressString.render({ value: 100, width: 10, style: 'blocks' })
    expect(o).not.toContain('░')
  })
  it('shows percentage when showPercent is true', () => {
    expect(ProgressString.render({ value: 50, width: 20, showPercent: true })).toContain('50%')
  })
  it('clamps value above 100', () => {
    expect(ProgressString.render({ value: 999, width: 10, showPercent: true })).toContain('100%')
  })
  it('clamps value below 0', () => {
    expect(ProgressString.render({ value: -5, width: 10, showPercent: true })).toContain('  0%')
  })
})