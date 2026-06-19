import { describe, it, expect, vi } from "vitest";
import { Screen, createKeyEvent } from "@termuijs/core";

const keyOf = (key: string) =>
    createKeyEvent({ key, raw: Buffer.from(key), ctrl: false, alt: false, shift: false });

describe("ContextMenu", () => {
    it("renders item labels", async () => {
        const { ContextMenu } = await import("./ContextMenu.js");

        const menu = new ContextMenu({
            x: 0,
            y: 0,
            visible: true,
            items: [
                { label: "Item 1", action: () => {} },
                { label: "Item 2", action: () => {} }
            ]
        });

        menu.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 5,
        });

        const screen = new Screen(20, 5);
        menu.render(screen);

        const renderedLine1 = screen.back[1].map((c: { char: string }) => c.char).join("");
        const renderedLine2 = screen.back[2].map((c: { char: string }) => c.char).join("");

        expect(renderedLine1).toContain("Item 1");
        expect(renderedLine2).toContain("Item 2");
    });

    it("arrow keys change selection", async () => {
        const { ContextMenu } = await import("./ContextMenu.js");

        let selected = "";
        const menu = new ContextMenu({
            visible: true,
            items: [
                { label: "A", action: () => { selected = "A"; } },
                { label: "B", action: () => { selected = "B"; } },
                { label: "C", action: () => { selected = "C"; } }
            ]
        });

        menu.handleKey(keyOf("down"));
        menu.handleKey(keyOf("enter"));
        expect(selected).toBe("B");

        menu.handleKey(keyOf("down"));
        menu.handleKey(keyOf("enter"));
        expect(selected).toBe("C");

        menu.handleKey(keyOf("up"));
        menu.handleKey(keyOf("enter"));
        expect(selected).toBe("B");

        menu.handleKey(keyOf("up"));
        menu.handleKey(keyOf("up"));
        menu.handleKey(keyOf("enter"));
        expect(selected).toBe("C"); // Wrap around backwards
    });

    it("enter calls the correct item's action", async () => {
        const { ContextMenu } = await import("./ContextMenu.js");

        let actionCalled = false;
        const menu = new ContextMenu({
            visible: true,
            items: [
                { label: "Item", action: () => { actionCalled = true; } }
            ]
        });

        menu.handleKey(keyOf("enter"));
        expect(actionCalled).toBe(true);
    });
});
