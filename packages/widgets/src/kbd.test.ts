import { describe, expect, it, vi, afterEach } from "vitest"
import { Kbd } from "./kbd.js"
import { Screen, caps } from '@termuijs/core'

describe("Kbd", () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("renders text with brackets", () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false)
        const widget = new Kbd("Ctrl+C")
        const screen = new Screen(20, 1)
        widget.updateRect({ x: 0, y: 0, width: 20, height: 1 })
        widget.render(screen)

        const row0 = screen.back[0].map(c => c.char).join('')
        expect(row0).toContain('[ Ctrl+C ]')
    })

    it("renders with unicode brackets", () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true)
        const widget = new Kbd("Shift")
        const screen = new Screen(20, 1)
        widget.updateRect({ x: 0, y: 0, width: 20, height: 1 })
        widget.render(screen)

        const row0 = screen.back[0].map(c => c.char).join('')
        expect(row0).toContain('⟨ Shift ⟩')
    })

    it("setText updates the text", () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false)
        const widget = new Kbd("A")
        const screen = new Screen(20, 1)
        widget.updateRect({ x: 0, y: 0, width: 20, height: 1 })
        
        widget.render(screen)
        expect(screen.back[0].map(c => c.char).join('')).toContain('[ A ]')

        widget.setText("B")
        widget.render(screen)
        expect(screen.back[0].map(c => c.char).join('')).toContain('[ B ]')
    })

    it("getText returns the text", () => {
        const widget = new Kbd("Esc")
        expect(widget.getText()).toBe("Esc")
    })
})
