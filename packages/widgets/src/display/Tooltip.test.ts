import { describe, it, expect, vi, afterEach } from "vitest";
import { Tooltip } from "./Tooltip.js";
import { Screen, caps, prefersReducedMotion } from "@termuijs/core";
import * as motion from "@termuijs/motion";

afterEach(() => {
    vi.restoreAllMocks();
});

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
    it("setVisible(true) starts fade-in (animOpacity resets to 0)", () => {
        vi.spyOn(caps, "motion", "get").mockReturnValue(true);

        const tooltip = new Tooltip({
            text: "help",
            visible: false,
        });

        expect((tooltip as any)._animOpacity).toBe(0);

        tooltip.setVisible(true);

        expect((tooltip as any)._animOpacity).toBe(0);
        expect(tooltip.getVisible()).toBe(true);
    });
    it("setVisible(false) during fade-in cancels previous animation", () => {
        vi.spyOn(caps, "motion", "get").mockReturnValue(true);

        const tooltip = new Tooltip({
            text: "help",
            visible: true,
        });

        const cancel = vi.fn();
        vi.spyOn(motion, "fadeOut").mockReturnValue(cancel);

        tooltip.setVisible(false);

        expect(motion.fadeOut).toHaveBeenCalledTimes(1);
    });
    it("renders with dim attribute during fade-out", () => {
        vi.spyOn(caps, "motion", "get").mockReturnValue(true);
        vi.spyOn(motion, "fadeOut").mockImplementation(
            (_duration, onFrame, _onComplete) => {
                onFrame(0.3);
                return vi.fn();
            },
        );

        const tooltip = new Tooltip({
            text: "dimmed",
            visible: true,
        });
        const screen = new Screen(20, 5);
        tooltip.updateRect({ x: 0, y: 0, width: 20, height: 5 });

        tooltip.setVisible(false);
        tooltip.render(screen);

        expect(screen.back[0][0].dim).toBe(true);
    });
    it("renders without dim when animOpacity is above threshold", () => {
        vi.spyOn(motion, "fadeIn").mockImplementation(
            (_duration, onFrame, _onComplete) => {
                onFrame(0.7);
                return vi.fn();
            },
        );

        const tooltip = new Tooltip({
            text: "bright",
            visible: false,
        });
        const screen = new Screen(20, 5);
        tooltip.updateRect({ x: 0, y: 0, width: 20, height: 5 });

        tooltip.setVisible(true);
        tooltip.render(screen);

        expect(screen.back[0][0].dim).toBe(false);
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

describe("Tooltip – reduced motion", () => {
    it("skips fade-in when prefersReducedMotion is true", () => {
        vi.spyOn(caps, "motion", "get").mockReturnValue(false);

        const tooltip = new Tooltip({
            text: "help",
            visible: false,
        });

        tooltip.setVisible(true);

        expect((tooltip as any)._animOpacity).toBe(1);
    });

    it("skips fade-out when prefersReducedMotion is true", () => {
        vi.spyOn(caps, "motion", "get").mockReturnValue(false);

        const tooltip = new Tooltip({
            text: "help",
            visible: true,
        });

        tooltip.setVisible(false);

        expect((tooltip as any)._animOpacity).toBe(0);
    });
});

describe("Tooltip – mount/unmount", () => {
    it("restores animOpacity on mount if visible", () => {
        const tooltip = new Tooltip({
            text: "help",
            visible: true,
        });

        (tooltip as any)._animOpacity = 0;
        tooltip.mount();

        expect((tooltip as any)._animOpacity).toBe(1);
    });

    it("cancels animation on unmount", () => {
        vi.spyOn(caps, "motion", "get").mockReturnValue(true);

        const cancel = vi.fn();
        const tooltip = new Tooltip({
            text: "help",
            visible: false,
        });

        vi.spyOn(motion, "fadeIn").mockReturnValue(cancel);

        tooltip.setVisible(true);

        tooltip.unmount();

        expect(cancel).toHaveBeenCalled();
    });
});
