// ─────────────────────────────────────────────────────
// @termuijs/widgets — Tests for Gradient widget
// ─────────────────────────────────────────────────────

import { describe, expect, it, vi, afterEach } from "vitest";
import { Gradient } from "./Gradient.js";
import { Screen, caps } from '@termuijs/core';

describe("Gradient Widget — Initialization & Mutations", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("initializes with default options and dirty status", () => {
        const widget = new Gradient("Hello");
        expect(widget).toBeDefined();
        expect(widget.isDirty).toBe(true); // Starts dirty
    });

    it("setText updates text and marks dirty", () => {
        const widget = new Gradient("A");
        widget.clearDirty();
        expect(widget.isDirty).toBe(false);

        widget.setText("B");
        expect(widget.isDirty).toBe(true);
    });

    it("setColors updates colors and marks dirty", () => {
        const widget = new Gradient("Hello");
        widget.clearDirty();
        expect(widget.isDirty).toBe(false);

        widget.setColors("#00ff00", "#ff00ff");
        expect(widget.isDirty).toBe(true);
    });
});

describe("Gradient Widget — Rendering & Colors", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders plain text without color support", () => {
        vi.spyOn(caps, 'color', 'get').mockReturnValue(false);
        const widget = new Gradient("Hello");
        const screen = new Screen(20, 1);
        widget.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        widget.render(screen);

        const row0 = screen.back[0].map(c => c.char).join('');
        expect(row0).toContain('Hello');
    });

    it("renders with rgb colors", () => {
        vi.spyOn(caps, 'color', 'get').mockReturnValue(true);
        const widget = new Gradient("Hello", {}, { startColor: '#ff0000', endColor: '#0000ff' });
        const screen = new Screen(20, 1);
        widget.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        widget.render(screen);

        // H should be red
        expect(screen.back[0][0].fg).toEqual({ type: 'rgb', r: 255, g: 0, b: 0 });
        // o should be blue
        expect(screen.back[0][4].fg).toEqual({ type: 'rgb', r: 0, g: 0, b: 255 });
    });

    it("falls back to single start color when end color is invalid hex", () => {
        vi.spyOn(caps, 'color', 'get').mockReturnValue(true);
        // Using an invalid endColor
        const widget = new Gradient("Hello", {}, { startColor: '#ff0000', endColor: 'invalid' });
        const screen = new Screen(20, 1);
        widget.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        widget.render(screen);

        // All cells should fall back to startColor ('#ff0000' -> Hex/RGB)
        expect(screen.back[0][0].fg).toEqual({ type: 'hex', hex: '#ff0000' });
        expect(screen.back[0][4].fg).toEqual({ type: 'hex', hex: '#ff0000' });
    });

    it("falls back to default style fg color when both start and end colors are invalid hex", () => {
        vi.spyOn(caps, 'color', 'get').mockReturnValue(true);
        const widget = new Gradient("Hello", { fg: { type: 'named', name: 'green' } }, { startColor: 'invalid', endColor: 'invalid' });
        const screen = new Screen(20, 1);
        widget.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        widget.render(screen);

        // Should fall back to default style's fg color (green)
        expect(screen.back[0][0].fg).toEqual({ type: 'named', name: 'green' });
    });
});

describe("Gradient Widget — Layout & Alignment", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("does not render if width <= 0 or text is empty", () => {
        const widget = new Gradient("");
        const screen = new Screen(20, 1);
        widget.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        widget.render(screen);
        expect(screen.back[0].map(c => c.char).join('').trim()).toBe('');

        const widgetZeroWidth = new Gradient("Hello");
        widgetZeroWidth.updateRect({ x: 0, y: 0, width: 0, height: 1 });
        widgetZeroWidth.render(screen);
        expect(screen.back[0].map(c => c.char).join('').trim()).toBe('');
    });

    it("aligns text correctly", () => {
        vi.spyOn(caps, 'color', 'get').mockReturnValue(false);

        // Right alignment
        const widgetRight = new Gradient("A", {}, { align: 'right' });
        const screen = new Screen(20, 1);
        widgetRight.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        widgetRight.render(screen);
        expect(screen.back[0][19].char).toBe('A');

        // Center alignment
        const widgetCenter = new Gradient("A", {}, { align: 'center' });
        widgetCenter.updateRect({ x: 0, y: 0, width: 20, height: 1 });
        
        for (let x = 0; x < 20; x++) screen.setCell(x, 0, { char: ' ' } as any);
        widgetCenter.render(screen);
        // (20 - 1) / 2 = 9. So index 9 is A.
        expect(screen.back[0][9].char).toBe('A');

        // Left alignment (default)
        const widgetLeft = new Gradient("A", {}, { align: 'left' });
        widgetLeft.updateRect({ x: 0, y: 0, width: 20, height: 1 });

        for (let x = 0; x < 20; x++) screen.setCell(x, 0, { char: ' ' } as any);
        widgetLeft.render(screen);
        expect(screen.back[0][0].char).toBe('A');
    });

    it("does not mark dirty when text is unchanged", () => {
        const widget = new Gradient("Hello");

        widget.clearDirty();
        widget.setText("Hello");

        expect(widget.isDirty).toBe(false);
    });

    it("does not mark dirty when colors are unchanged", () => {
        const widget = new Gradient("Hello", {}, { startColor: "#ff0000", endColor: "#0000ff" });

        widget.clearDirty();
        widget.setColors("#ff0000", "#0000ff");

        expect(widget.isDirty).toBe(false);
    });

    it("marks dirty when text changes", () => {
        const widget = new Gradient("Hello");

        widget.clearDirty();
        widget.setText("World");

        expect(widget.isDirty).toBe(true);
    });

    it("marks dirty when colors change", () => {
        const widget = new Gradient("Hello", {}, { startColor: "#ff0000", endColor: "#0000ff" });

        widget.clearDirty();
        widget.setColors("#00ff00", "#ffff00");

        expect(widget.isDirty).toBe(true);
    });
});
