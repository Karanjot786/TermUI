import { createTooltip } from './Tooltip'

describe('Tooltip fade animation', () => {
  it('starts hidden with opacity 0', () => {
    const tooltip = createTooltip({ content: 'Hello', children: 'Hover me' })
    const state = tooltip.getState()
    expect(state.visible).toBe(false)
    expect(state.opacity).toBe(0)
  })

  it('becomes visible on show()', () => {
    const tooltip = createTooltip({ content: 'Hello', children: 'Hover me' })
    tooltip.show()
    const state = tooltip.getState()
    expect(state.visible).toBe(true)
  })

  it('hides on hide()', (done) => {
    const tooltip = createTooltip({ content: 'Hello', children: 'Hover me' })
    tooltip.show()
    setTimeout(() => {
      tooltip.hide()
      setTimeout(() => {
        const state = tooltip.getState()
        expect(state.visible).toBe(false)
        expect(state.opacity).toBe(0)
        done()
      }, 300)
    }, 300)
  })

  it('respects custom animationDuration', () => {
    const tooltip = createTooltip({
      content: 'Hello',
      children: 'Hover me',
      animationDuration: 200,
    })
    tooltip.show()
    const state = tooltip.getState()
    expect(state.visible).toBe(true)
  })

  it('supports all positions', () => {
    const positions = ['top', 'bottom', 'left', 'right'] as const
    positions.forEach((position) => {
      const tooltip = createTooltip({
        content: 'Hello',
        children: 'Hover me',
        position,
      })
      tooltip.show()
      expect(tooltip.getState().visible).toBe(true)
    })
  })
})
