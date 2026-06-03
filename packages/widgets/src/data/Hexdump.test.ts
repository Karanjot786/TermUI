import { describe, expect, it } from "vitest"
import { Hexdump } from "./Hexdump"

describe("Hexdump", () => {
    it("creates widget instance", () => {
        const widget = new Hexdump(
            new Uint8Array([65, 66, 67]),
        )

        expect(widget).toBeInstanceOf(Hexdump)
    })
})
