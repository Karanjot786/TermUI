import { describe, expect, it } from "vitest"
import { Hexdump } from "./Hexdump"
import { Screen } from "@termuijs/core"

describe("Hexdump", () => {
    it("creates widget instance", () => {
        const widget = new Hexdump(
            new Uint8Array([65, 66, 67]),
        )

        expect(widget).toBeInstanceOf(Hexdump)
    })

    it("renders hexdump correctly", () => {
        const screen = new Screen(80, 10)
        const data = new Uint8Array([72, 101, 108, 108, 111, 0, 87, 111, 114, 108, 100]) // "Hello\0World"
        const widget = new Hexdump(data, { width: 80, height: 10 })
        
        widget.updateRect({ x: 0, y: 0, width: 80, height: 10 })
        widget.render(screen)

        const row0 = screen.back[0].map(c => c.char).join('')
        
        expect(row0).toContain('00000000')
        expect(row0).toContain('48 65 6C 6C 6F 00 57 6F 72 6C 64')
        expect(row0).toContain('Hello.World')
    })
})
