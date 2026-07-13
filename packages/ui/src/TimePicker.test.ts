import { describe, it, expect } from "vitest";
import { Screen, createKeyEvent } from "@termuijs/core";
import { TimePicker } from "./TimePicker.js";

describe("TimePicker", () => {
    it("renders with initial values", () => {
        const screen = new Screen(40, 3);
        const d = new Date(2020, 1, 1, 14, 30); // 2:30 PM
        const picker = new TimePicker({ value: d, use24Hour: false });
        picker.updateRect({ x: 0, y: 0, width: 40, height: 3 });
        picker.render(screen);

        const row = screen.getLine(1); // center row
        expect(row).toContain("02:30 PM");
    });

    it("renders with 24-hour time", () => {
        const screen = new Screen(40, 3);
        const d = new Date(2020, 1, 1, 14, 30);
        const picker = new TimePicker({ value: d, use24Hour: true });
        picker.updateRect({ x: 0, y: 0, width: 40, height: 3 });
        picker.render(screen);

        const row = screen.getLine(1);
        expect(row).toContain("14:30");
        expect(row).not.toContain("PM");
    });

    it("handles keyboard events to increment hours", () => {
        const d = new Date(2020, 1, 1, 14, 30);
        const picker = new TimePicker({ value: d });

        // Active segment is 0 (Hours) by default
        picker.handleKey(createKeyEvent({ key: "up", raw: Buffer.from(""), ctrl: false, alt: false, shift: false }));
        expect(picker.value.getHours()).toBe(15);
    });

    it("returns a defensive copy from value getter", () => {
        const d = new Date(2020, 1, 1, 14, 30);
        const picker = new TimePicker({ value: d });

        const value = picker.value;
        value.setHours(23);

        expect(picker.value.getHours()).toBe(14);
    });

    it("handles keyboard events to increment minutes", () => {
        const d = new Date(2020, 1, 1, 14, 30);
        const picker = new TimePicker({ value: d });

        // Move to minutes
        picker.handleKey(createKeyEvent({ key: "right", raw: Buffer.from(""), ctrl: false, alt: false, shift: false }));
        picker.handleKey(createKeyEvent({ key: "up", raw: Buffer.from(""), ctrl: false, alt: false, shift: false }));
        expect(picker.value.getMinutes()).toBe(31);
    });

    it("handles keyboard events to toggle AM/PM", () => {
        const d = new Date(2020, 1, 1, 14, 30); // 2:30 PM
        const picker = new TimePicker({ value: d });

        // Move to AM/PM
        picker.handleKey(createKeyEvent({ key: "right", raw: Buffer.from(""), ctrl: false, alt: false, shift: false }));
        picker.handleKey(createKeyEvent({ key: "right", raw: Buffer.from(""), ctrl: false, alt: false, shift: false }));
        picker.handleKey(createKeyEvent({ key: "up", raw: Buffer.from(""), ctrl: false, alt: false, shift: false }));
        expect(picker.value.getHours()).toBe(2); // 14 - 12 = 2 (AM)
    });
});
