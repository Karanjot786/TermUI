import { describe, it, expect } from "vitest";
import { Tooltip } from "./Tooltip.js";
import { Screen, caps } from "@termuijs/core";
import { vi } from 'vitest';


function renderTooltip(text = "help", visible = true, width = 20, height = 5) {
    const tooltip = new Tooltip({
        text,
        visible,
    });

    const screen = new Screen(width, height);

    tooltip.updateRect({
        x: 0,
        y: 0,
        width,
        height,
    });

    tooltip.render(screen);

    return { tooltip, screen };
}

describe("Tooltip", () => {
    it("renders text when visible", () => {
        const { screen } = renderTooltip("hello");

        const rendered = screen.back
            .flat()
            .map((cell) => cell.char)
            .join("");

        expect(rendered).toContain("h");
    });
    it("does not render when hidden", () => {
        const { screen } = renderTooltip("hidden", false);

        const rendered = screen.back
            .flat()
            .map((cell) => cell.char)
            .join("");

        expect(rendered).not.toContain("h");
    });
    it("setVisible marks widget dirty", () => {
        const tooltip = new Tooltip({
            text: "help",
            visible: true,
        });

        tooltip.clearDirty();

        tooltip.setVisible(false);

        expect(tooltip.isDirty).toBe(true);
    });
    it("renders unicode border by default", () => {
        const { screen } = renderTooltip();

        expect(screen.back[0][0].char).toBe("┌");
    });
    it("uses ASCII borders when unicode is disabled", () => {
        vi.spyOn(caps, "unicode", "get").mockReturnValue(false);
        const { screen } = renderTooltip();
        expect(screen.back[0][0].char).toBe("+");
        vi.restoreAllMocks();
    });
    it("setText marks widget dirty", () => {
        const tooltip = new Tooltip({
            text: "old",
            visible: true,
        });

        tooltip.clearDirty();

        tooltip.setText("new");

        expect(tooltip.isDirty).toBe(true);
        expect(tooltip.getText()).toBe("new");
    });
    it("getVisible returns current visibility", () => {
        const tooltip = new Tooltip({
            text: "help",
            visible: true,
        });

        expect(tooltip.getVisible()).toBe(true);

        tooltip.setVisible(false);

        expect(tooltip.getVisible()).toBe(false);
    });
});

describe("Tooltip – mutation regression tests", () => {
    it("does not mark dirty when text is unchanged", () => {
        const tooltip = new Tooltip({
            text: "help",
            visible: true,
        });

        tooltip.clearDirty();
        tooltip.setText("help");

        expect(tooltip.isDirty).toBe(false);
    });

    it("does not mark dirty when visibility is unchanged", () => {
        const tooltip = new Tooltip({
            text: "help",
            visible: true,
        });

        tooltip.clearDirty();
        tooltip.setVisible(true);

        expect(tooltip.isDirty).toBe(false);
    });

    it("marks dirty when text changes", () => {
        const tooltip = new Tooltip({
            text: "old",
            visible: true,
        });

        tooltip.clearDirty();
        tooltip.setText("new");

        expect(tooltip.getText()).toBe("new");
        expect(tooltip.isDirty).toBe(true);
    });

    it("marks dirty when visibility changes", () => {
        const tooltip = new Tooltip({
            text: "help",
            visible: true,
        });

        tooltip.clearDirty();
        tooltip.setVisible(false);

        expect(tooltip.getVisible()).toBe(false);
        expect(tooltip.isDirty).toBe(true);
    });
});