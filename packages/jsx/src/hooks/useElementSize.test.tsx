/** @jsxImportSource @termuijs/jsx */
import { describe, it, expect, afterEach } from "vitest";
import { createFiber, setCurrentFiber, clearCurrentFiber } from "../hooks.js";
import { useElementSize } from "./useElementSize.js";

describe("useElementSize", () => {
    afterEach(() => {
        clearCurrentFiber();
    });

    it("returns 0 width and height when no widget is attached", () => {
        const fiber = createFiber();
        setCurrentFiber(fiber);
        const [, size] = useElementSize();
        expect(size.width).toBe(0);
        expect(size.height).toBe(0);
    });
});
