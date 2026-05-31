import { describe, it, expect } from "vitest";
import { Tooltip } from "./Tooltip.js";
import { Screen, caps } from "@termuijs/core";

function renderTooltip(
    text = "help",
    position: "top" | "bottom" | "left" | "right" = "bottom",
    visible = true,
    width = 20,
    height = 5,
) {
    const tooltip = new Tooltip({
        text,
        position,
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
        const { screen } = renderTooltip("hidden", "bottom", false);

        const rendered = screen.back
            .flat()
            .map((cell) => cell.char)
            .join("");

        expect(rendered).not.toContain("h");
    });
    it("setVisible marks widget dirty", () => {
        const tooltip = new Tooltip({
            text: "help",
            position: "bottom",
            visible: true,
        });

        tooltip.clearDirty();

        tooltip.setVisible(false);

        expect(tooltip.isDirty).toBe(true);
    });
    it("setPosition marks widget dirty", () => {
        const tooltip = new Tooltip({
            text: "help",
            position: "bottom",
            visible: true,
        });

        tooltip.clearDirty();

        tooltip.setPosition("top");

        expect(tooltip.isDirty).toBe(true);
    });
    it("renders unicode border by default", () => {
        const { screen } = renderTooltip();

        expect(screen.back[0][0].char).toBe("┌");
    });
    it("uses ASCII borders when unicode is disabled", () => {
        const orig = caps.unicode;
        (caps as any).unicode = false;

        try {
            const { screen } = renderTooltip();

            expect(screen.back[0][0].char).toBe("+");
            expect(screen.back[1][0].char).toBe("|");
        } finally {
            (caps as any).unicode = orig;
        }
    });
    it("stores position changes", () => {
        const tooltip = new Tooltip({
            text: "help",
            position: "bottom",
            visible: true,
        });

        tooltip.setPosition("top");

        expect(() => tooltip.render(new Screen(20, 5))).not.toThrow();
    });
    it("setText marks widget dirty", () => {
        const tooltip = new Tooltip({
            text: "old",
            position: "bottom",
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
            position: "bottom",
            visible: true,
        });

        expect(tooltip.getVisible()).toBe(true);

        tooltip.setVisible(false);

        expect(tooltip.getVisible()).toBe(false);
    });
    it("getPosition returns current position", () => {
        const tooltip = new Tooltip({
            text: "help",
            position: "bottom",
            visible: true,
        });

        expect(tooltip.getPosition()).toBe("bottom");

        tooltip.setPosition("top");

        expect(tooltip.getPosition()).toBe("top");
    });
});
