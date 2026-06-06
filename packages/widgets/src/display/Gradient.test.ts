import { describe, expect, it, vi, afterEach } from "vitest"
import { Gradient } from "./Gradient.js"
import { Screen, caps } from '@termuijs/core'

describe("Gradient", () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("renders plain text without color support", () => {
        vi.spyOn(caps, 'color', 'get').mockReturnValue(false)
        const widget = new Gradient("Hello")
        const screen = new Screen(20, 1)
        widget.updateRect({ x: 0, y: 0, width: 20, height: 1 })
        widget.render(screen)

        const row0 = screen.back[0].map(c => c.char).join('')
        expect(row0).toContain('Hello')
    })

    it("renders with rgb colors", () => {
        vi.spyOn(caps, 'color', 'get').mockReturnValue(true)
        const widget = new Gradient("Hello", {}, { startColor: '#ff0000', endColor: '#0000ff' })
        const screen = new Screen(20, 1)
        widget.updateRect({ x: 0, y: 0, width: 20, height: 1 })
        widget.render(screen)

        // H should be red
        expect(screen.back[0][0].fg).toEqual({ type: 'rgb', r: 255, g: 0, b: 0 })
        // o should be blue
        expect(screen.back[0][4].fg).toEqual({ type: 'rgb', r: 0, g: 0, b: 255 })
    })

    it("setText updates text", () => {
        vi.spyOn(caps, 'color', 'get').mockReturnValue(false)
        const widget = new Gradient("A")
        const screen = new Screen(20, 1)
        widget.updateRect({ x: 0, y: 0, width: 20, height: 1 })
        widget.render(screen)
        expect(screen.back[0].map(c => c.char).join('')).toContain('A')

        widget.setText("B")
        widget.render(screen)
        expect(screen.back[0].map(c => c.char).join('')).toContain('B')
    })

    it("aligns text correctly", () => {
        vi.spyOn(caps, 'color', 'get').mockReturnValue(false)
        
        const widget = new Gradient("A", {}, { align: 'right' })
        const screen = new Screen(20, 1)
        widget.updateRect({ x: 0, y: 0, width: 20, height: 1 })
        
        // Clear screen first if we reuse it
        for (let x = 0; x < 20; x++) screen.setCell(x, 0, { char: ' ' } as any)
        
        widget.render(screen)
        expect(screen.back[0][19].char).toBe('A')

        const widgetCenter = new Gradient("A", {}, { align: 'center' })
        widgetCenter.updateRect({ x: 0, y: 0, width: 20, height: 1 })
        
        for (let x = 0; x < 20; x++) screen.setCell(x, 0, { char: ' ' } as any)
        
        widgetCenter.render(screen)
        // (20 - 1) / 2 = 9. So index 9 is A.
        expect(screen.back[0][9].char).toBe('A')
    })
})
