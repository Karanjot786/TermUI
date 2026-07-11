import { describe, it, expect, vi } from "vitest";
import { Box } from "@termuijs/widgets";
import { createElement } from "@termuijs/jsx";
import { render } from "./render.js";

describe("mouse target resolution", () => {
    it("dispatches clicks to the deepest matching widget", () => {
        // render() reconciles a VNode into a real Widget tree, so the tree under
        // test has to be built through createElement() rather than by constructing
        // Widget instances directly (those never enter the reconciled tree).
        // An outer <box> with a single nested <box> child reconciles into two
        // Box widgets; the test renderer's layout gives a single child the same
        // rect as its parent, so the two widgets fully overlap.
        const t = render(createElement("box", null, createElement("box", null)));

        const parent = (t.container as any)._children[0] as Box; // as any: Widget._children is protected; needed to reach the reconciled widget under test
        const child = (parent as any)._children[0] as Box; // as any: Widget._children is protected; needed to reach the reconciled child widget under test

        const parentMouse = vi.fn();
        const childMouse = vi.fn();

        parent.events.on("mouse", parentMouse);
        child.events.on("mouse", childMouse);

        t.click(5, 5);

        expect(childMouse).toHaveBeenCalled();
        expect(parentMouse).not.toHaveBeenCalled();
    });
});
