import { describe, it, expect, vi } from "vitest";
import { Widget } from "@termuijs/widgets";
import { render } from "./render.js";

class ClickableWidget extends Widget {
    protected _renderSelf(): void {}
}

describe("mouse target resolution", () => {
    it("dispatches clicks to the deepest matching widget", () => {
        const parent = new ClickableWidget();
        const child = new ClickableWidget();

        parent.updateRect({
            x: 0,
            y: 0,
            width: 10,
            height: 10,
        });

        child.updateRect({
            x: 0,
            y: 0,
            width: 10,
            height: 10,
        });

        parent.addChild(child);

        const parentMouse = vi.fn();
        const childMouse = vi.fn();

        parent.events.on("mouse", parentMouse);
        child.events.on("mouse", childMouse);

        const screen = render(parent);

        screen.click(5, 5);

        expect(childMouse).toHaveBeenCalled();
        expect(parentMouse).not.toHaveBeenCalled();
    });
});