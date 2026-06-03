import { describe, it, expect } from "vitest";
import { BasicAuthPrompt } from "./BasicAuthPrompt";
import { createElement, useRef } from "@termuijs/jsx";
import { render } from "@termuijs/testing";

describe("BasicAuthPrompt", () => {
    it("updates username on keypress", () => {
        const input = new BasicAuthPrompt();
        input.handleKey({
            key: "x",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.from("x"),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        input.handleKey({
            key: "y",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.from("y"),
            stopPropagation: () => {},
            preventDefault: () => {},
        });

        expect(input.getCredentials()).toEqual({
            username: "xy",
            password: "",
        });
    });
    it("enter switches active field", () => {
        const input = new BasicAuthPrompt();
        input.handleKey({
            key: "m",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.from("m"),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        input.handleKey({
            key: "enter",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.alloc(0),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        input.handleKey({
            key: "1",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.from("1"),
            stopPropagation: () => {},
            preventDefault: () => {},
        });

        expect(input.getCredentials()).toEqual({
            username: "m",
            password: "1",
        });
    });
    it("submits credentials on enter from password field", () => {
        let result = null;
        const input = new BasicAuthPrompt(
            {},
            {
                onSubmit: (cred) => {
                    result = cred;
                },
            },
        );
        input.handleKey({
            key: "m",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.from("m"),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        input.handleKey({
            key: "enter",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.alloc(0),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        input.handleKey({
            key: "1",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.from("1"),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        input.handleKey({
            key: "enter",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.alloc(0),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        expect(result).toEqual({
            username: "m",
            password: "1",
        });
    });
    it("backspace removes chars", () => {
        const input = new BasicAuthPrompt();
        input.handleKey({
            key: "m",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.from("m"),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        input.handleKey({
            key: "e",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.from("e"),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        input.handleKey({
            key: "backspace",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.alloc(0),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        expect(input.getCredentials()).toEqual({
            username: "m",
            password: "",
        });
    });
    it("getCredentials returns current values", () => {
        const input = new BasicAuthPrompt();
        input.handleKey({
            key: "m",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.from("m"),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        input.handleKey({
            key: "enter",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.alloc(0),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        input.handleKey({
            key: "1",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.from("1"),
            stopPropagation: () => {},
            preventDefault: () => {},
        });

        expect(input.getCredentials()).toEqual({
            username: "m",
            password: "1",
        });
    });
    it("password field renders masked characters", () => {
        let input = new BasicAuthPrompt();
        const screen = render(
            createElement(() => {
                const ref = useRef<BasicAuthPrompt | null>(null);
                if (!ref.current) {
                    ref.current = new BasicAuthPrompt();
                }
                input = ref.current;
                return ref.current;
            }, null),
        );
        input.handleKey({
            key: "m",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.from("m"),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        input.handleKey({
            key: "enter",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.alloc(0),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        input.handleKey({
            key: "1",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.from("1"),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        input.handleKey({
            key: "2",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.from("2"),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        input.handleKey({
            key: "3",
            ctrl: false,
            shift: false,
            alt: false,
            raw: Buffer.from("3"),
            stopPropagation: () => {},
            preventDefault: () => {},
        });
        const mask = (input as any)._maskChar;
        screen.rerender();
        expect(screen.lastFrame().join("\n")).toContain(mask.repeat(3));
        expect(screen.lastFrame().join("\n")).not.toContain("123");
        screen.unmount();
    });
});
