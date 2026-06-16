import { describe, expect, it } from "vitest"
import { Hexdump } from "./Hexdump.js"
import { Screen } from '@termuijs/core'

describe("Hexdump", () => {
    it("renders hexdump rows correctly", () => {
        // "Hello World!" in ASCII
        const data = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33])
        const widget = new Hexdump(data)

        const screen = new Screen(80, 5)
        widget.updateRect({ x: 0, y: 0, width: 80, height: 5 })
        widget.render(screen)

        const row0 = screen.back[0].map((c: any) => c.char).join('')
        
        // Offset: 00000000
        expect(row0).toContain('00000000')
        // Hex values for "Hello Wo" "rld!"
        expect(row0).toContain('48 65 6c 6c 6f 20 57 6f  72 6c 64 21')
        // ASCII representation
        expect(row0).toContain('|Hello World!    |')
    })

    it("setData updates the view", () => {
        const widget = new Hexdump(new Uint8Array([65, 66, 67]))
        const screen = new Screen(80, 5)
        widget.updateRect({ x: 0, y: 0, width: 80, height: 5 })
        widget.render(screen)

        let row0 = screen.back[0].map((c: any) => c.char).join('')
        expect(row0).toContain('41 42 43')
        expect(row0).toContain('|ABC             |')

        widget.setData(new Uint8Array([88, 89, 90]))
        widget.render(screen)
        
        row0 = screen.back[0].map((c: any) => c.char).join('')
        expect(row0).toContain('58 59 5a')
        expect(row0).toContain('|XYZ             |')
    })
})
