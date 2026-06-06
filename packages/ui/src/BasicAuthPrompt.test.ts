import { describe, it, expect, vi, afterEach } from "vitest";
import { BasicAuthPrompt } from "./BasicAuthPrompt";
import { Screen, caps } from "@termuijs/core";
import { createElement, useRef } from "@termuijs/jsx";
import { render } from "@termuijs/testing";

// ─── shared test helper ───────────────────────────────────────────────────────
function makeKey(
    key: string,
    modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {},
) {
    return {
        key,
        ctrl: modifiers.ctrl ?? false,
        shift: modifiers.shift ?? false,
        alt: modifiers.alt ?? false,
        raw: Buffer.from(key),
        stopPropagation: () => {},
        preventDefault: () => {},
    };
}

function typeInto(widget: BasicAuthPrompt, text: string): void {
    for (const ch of text) {
        widget.handleKey(makeKey(ch));
    }
}

function pressEnter(widget: BasicAuthPrompt): void {
    widget.handleKey(makeKey("enter"));
}

function pressBackspace(widget: BasicAuthPrompt): void {
    widget.handleKey(makeKey("backspace"));
}

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

// ─── 1. Multiple backspaces on username ───────────────────────────────────────
describe("BasicAuthPrompt – multiple backspaces on username", () => {
    it("removes characters one at a time and reaches empty without throwing", () => {
        const widget = new BasicAuthPrompt();
        typeInto(widget, "abc");
        expect(widget.getCredentials().username).toBe("abc");

        pressBackspace(widget);
        expect(widget.getCredentials().username).toBe("ab");

        pressBackspace(widget);
        expect(widget.getCredentials().username).toBe("a");

        pressBackspace(widget);
        expect(widget.getCredentials().username).toBe("");
    });

    it("removes characters one at a time on the password field", () => {
        const widget = new BasicAuthPrompt();
        pressEnter(widget); // switch to password
        typeInto(widget, "xyz");
        expect(widget.getCredentials().password).toBe("xyz");

        pressBackspace(widget);
        expect(widget.getCredentials().password).toBe("xy");

        pressBackspace(widget);
        expect(widget.getCredentials().password).toBe("x");

        pressBackspace(widget);
        expect(widget.getCredentials().password).toBe("");
    });
});

// ─── 2. Backspace on empty fields ─────────────────────────────────────────────
describe("BasicAuthPrompt – backspace on empty fields", () => {
    it("does not throw and leaves username empty", () => {
        const widget = new BasicAuthPrompt();
        expect(() => pressBackspace(widget)).not.toThrow();
        expect(widget.getCredentials().username).toBe("");
    });

    it("does not throw and leaves password empty", () => {
        const widget = new BasicAuthPrompt();
        pressEnter(widget); // switch to password
        expect(() => pressBackspace(widget)).not.toThrow();
        expect(widget.getCredentials().password).toBe("");
    });
});

// ─── 3. Ctrl / Alt combinations are ignored ───────────────────────────────────
describe("BasicAuthPrompt – ctrl and alt modifier keys are ignored", () => {
    const ignored = [
        { key: "a", ctrl: true },
        { key: "c", ctrl: true },
        { key: "v", ctrl: true },
        { key: "x", alt: true },
        { key: "enter", alt: true },
    ];

    for (const mod of ignored) {
        it(`ignores ${mod.ctrl ? "ctrl" : "alt"}+${mod.key}`, () => {
            const widget = new BasicAuthPrompt();
            widget.handleKey(makeKey(mod.key, mod));
            expect(widget.getCredentials()).toEqual({ username: "", password: "" });
        });
    }
});

// ─── 4. Non-printable navigation keys are ignored ─────────────────────────────
describe("BasicAuthPrompt – non-printable keys are ignored", () => {
    const nonPrintable = ["up", "down", "left", "right", "tab", "escape"];

    for (const key of nonPrintable) {
        it(`ignores key "${key}"`, () => {
            const widget = new BasicAuthPrompt();
            // Typing first so any accidental insertion shows up in username
            typeInto(widget, "u");
            widget.handleKey(makeKey(key));
            expect(widget.getCredentials().username).toBe("u");
            expect(widget.getCredentials().password).toBe("");
        });
    }
});

// ─── 5. Empty credential submission ───────────────────────────────────────────
describe("BasicAuthPrompt – empty credential submission", () => {
    it("submits empty strings when enter is pressed twice without typing", () => {
        let received: { username: string; password: string } | null = null;
        const widget = new BasicAuthPrompt(
            {},
            { onSubmit: (cred) => { received = cred; } },
        );

        pressEnter(widget); // username → password
        pressEnter(widget); // submit

        expect(received).toEqual({ username: "", password: "" });
    });
});

// ─── 6. Multiple consecutive submissions ──────────────────────────────────────
describe("BasicAuthPrompt – multiple consecutive submissions", () => {
    it("invokes onSubmit each time enter is pressed from the password field", () => {
        const calls: { username: string; password: string }[] = [];
        const widget = new BasicAuthPrompt(
            {},
            { onSubmit: (cred) => calls.push({ ...cred }) },
        );

        typeInto(widget, "user");
        pressEnter(widget); // switch to password
        typeInto(widget, "pass");
        pressEnter(widget); // first submit
        pressEnter(widget); // second submit (still on password field)

        expect(calls.length).toBe(2);
        expect(calls[0]).toEqual({ username: "user", password: "pass" });
        expect(calls[1]).toEqual({ username: "user", password: "pass" });
    });
});

// ─── 7. Username and password field isolation ─────────────────────────────────
describe("BasicAuthPrompt – field isolation", () => {
    it("typing in username does not affect password", () => {
        const widget = new BasicAuthPrompt();
        typeInto(widget, "abc");
        expect(widget.getCredentials().password).toBe("");
    });

    it("typing in password does not affect username", () => {
        const widget = new BasicAuthPrompt();
        typeInto(widget, "abc");
        pressEnter(widget); // switch to password
        typeInto(widget, "123");
        expect(widget.getCredentials().username).toBe("abc");
    });

    it("backspace in username does not affect password", () => {
        const widget = new BasicAuthPrompt();
        typeInto(widget, "abc");
        pressEnter(widget);
        typeInto(widget, "123");
        // pretend we go back — we cannot switch back, but confirm backspace
        // only applies to whichever field is active (password here)
        pressBackspace(widget);
        expect(widget.getCredentials().username).toBe("abc");
        expect(widget.getCredentials().password).toBe("12");
    });
});

// ─── 8. Long input strings ────────────────────────────────────────────────────
describe("BasicAuthPrompt – long input strings", () => {
    it("stores all characters of a 200-character username without truncation", () => {
        const widget = new BasicAuthPrompt();
        const longUser = "a".repeat(200);
        typeInto(widget, longUser);
        expect(widget.getCredentials().username).toBe(longUser);
        expect(widget.getCredentials().username).toHaveLength(200);
    });

    it("stores all characters of a 200-character password without truncation", () => {
        const widget = new BasicAuthPrompt();
        pressEnter(widget); // switch to password
        const longPass = "b".repeat(200);
        typeInto(widget, longPass);
        expect(widget.getCredentials().password).toBe(longPass);
        expect(widget.getCredentials().password).toHaveLength(200);
    });

    it("renders without throwing for a long username", () => {
        const widget = new BasicAuthPrompt();
        typeInto(widget, "a".repeat(200));
        const screen = new Screen(80, 10);
        widget.updateRect({ x: 0, y: 0, width: 80, height: 10 });
        expect(() => widget.render(screen)).not.toThrow();
    });
});

// ─── 9. Password mask length matches password length ─────────────────────────
describe("BasicAuthPrompt – password mask length", () => {
    it("renders exactly N mask characters for an N-character password", () => {
        vi.spyOn(caps, "unicode", "get").mockReturnValue(true);

        const widget = new BasicAuthPrompt();
        pressEnter(widget); // switch to password
        typeInto(widget, "secret"); // 6 chars

        const screen = new Screen(80, 5);
        widget.updateRect({ x: 0, y: 0, width: 80, height: 5 });
        widget.render(screen);

        const row1 = screen.back[1].map((c) => c.char).join("");
        // Exactly six ● should appear (the mask character)
        expect(row1).toContain("●●●●●●");
        // Seven or more should NOT match (no extra mask chars)
        expect(row1).not.toContain("●●●●●●●");
        // The real text should never appear
        expect(row1).not.toContain("secret");
    });

    afterEach(() => { vi.restoreAllMocks(); });
});

// ─── 10. ASCII and Unicode mask modes ─────────────────────────────────────────
describe("BasicAuthPrompt – ASCII and Unicode mask modes", () => {
    afterEach(() => { vi.restoreAllMocks(); });

    it("renders ● mask characters in Unicode mode", () => {
        vi.spyOn(caps, "unicode", "get").mockReturnValue(true);

        const widget = new BasicAuthPrompt();
        pressEnter(widget);
        typeInto(widget, "abc");

        const screen = new Screen(80, 5);
        widget.updateRect({ x: 0, y: 0, width: 80, height: 5 });
        widget.render(screen);

        const row1 = screen.back[1].map((c) => c.char).join("");
        expect(row1).toContain("●●●");
        expect(row1).not.toContain("***");
    });

    it("renders * mask characters in ASCII mode", () => {
        vi.spyOn(caps, "unicode", "get").mockReturnValue(false);

        const widget = new BasicAuthPrompt();
        pressEnter(widget);
        typeInto(widget, "abc");

        const screen = new Screen(80, 5);
        widget.updateRect({ x: 0, y: 0, width: 80, height: 5 });
        widget.render(screen);

        const row1 = screen.back[1].map((c) => c.char).join("");
        expect(row1).toContain("***");
        expect(row1).not.toContain("●●●");
    });
});

// ─── 11. Custom labels render correctly ───────────────────────────────────────
describe("BasicAuthPrompt – custom labels", () => {
    it("renders custom usernameLabel and passwordLabel in the output", () => {
        const widget = new BasicAuthPrompt(
            {},
            { usernameLabel: "User", passwordLabel: "Pass" },
        );

        const screen = new Screen(80, 5);
        widget.updateRect({ x: 0, y: 0, width: 80, height: 5 });
        widget.render(screen);

        const row0 = screen.back[0].map((c) => c.char).join("");
        const row1 = screen.back[1].map((c) => c.char).join("");

        expect(row0).toContain("User");
        expect(row0).not.toContain("Username:");
        expect(row1).toContain("Pass");
        expect(row1).not.toContain("Password:");
    });
});

// ─── 12. Rendering with minimal height (height = 1) ──────────────────────────
describe("BasicAuthPrompt – rendering with minimal height", () => {
    it("renders username row and omits password row when height is 1", () => {
        const widget = new BasicAuthPrompt();
        typeInto(widget, "alice");

        const screen = new Screen(80, 1);
        widget.updateRect({ x: 0, y: 0, width: 80, height: 1 });
        expect(() => widget.render(screen)).not.toThrow();

        const row0 = screen.back[0].map((c) => c.char).join("");
        expect(row0).toContain("alice");
        // Only one row exists; password line was not written
        expect(screen.rows).toBe(1);
    });
});

// ─── 13. Rendering with zero dimensions ───────────────────────────────────────
describe("BasicAuthPrompt – rendering with zero dimensions", () => {
    it("exits safely when width and height are both 0", () => {
        const widget = new BasicAuthPrompt();
        typeInto(widget, "abc");

        const screen = new Screen(40, 10);
        // Assign a zero-area rect to the widget (bypasses normal layout)
        widget.updateRect({ x: 0, y: 0, width: 0, height: 0 });
        expect(() => widget.render(screen)).not.toThrow();
    });
});

// ─── 14. getCredentials consistency across all operations ─────────────────────
describe("BasicAuthPrompt – getCredentials consistency", () => {
    it("always reflects the current internal state after typing", () => {
        const widget = new BasicAuthPrompt();
        typeInto(widget, "ab");
        expect(widget.getCredentials()).toEqual({ username: "ab", password: "" });
    });

    it("reflects correct state after backspacing", () => {
        const widget = new BasicAuthPrompt();
        typeInto(widget, "abc");
        pressBackspace(widget);
        expect(widget.getCredentials()).toEqual({ username: "ab", password: "" });
    });

    it("reflects correct state after switching fields", () => {
        const widget = new BasicAuthPrompt();
        typeInto(widget, "user");
        pressEnter(widget); // switch to password
        typeInto(widget, "pass");
        expect(widget.getCredentials()).toEqual({ username: "user", password: "pass" });
    });

    it("reflects correct state after submission", () => {
        let received: { username: string; password: string } | null = null;
        const widget = new BasicAuthPrompt(
            {},
            { onSubmit: (cred) => { received = cred; } },
        );
        typeInto(widget, "u");
        pressEnter(widget);
        typeInto(widget, "p");
        pressEnter(widget);

        // getCredentials() and the submitted value must be consistent
        expect(widget.getCredentials()).toEqual(received);
    });
});

// ─── 15. onSubmit is NOT triggered from the username field ────────────────────
describe("BasicAuthPrompt – two-step submission workflow", () => {
    it("does not invoke onSubmit when enter is pressed on the username field", () => {
        const onSubmit = vi.fn();
        const widget = new BasicAuthPrompt({}, { onSubmit });

        typeInto(widget, "alice");
        pressEnter(widget); // should switch field, not submit

        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("switches active field to password when enter is pressed on username", () => {
        const widget = new BasicAuthPrompt();
        typeInto(widget, "alice");
        pressEnter(widget); // switch to password

        // After switching, typing should go to password
        typeInto(widget, "pw");
        expect(widget.getCredentials()).toEqual({ username: "alice", password: "pw" });
    });
});
