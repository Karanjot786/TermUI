/** @jsxImportSource @termuijs/jsx */

import { describe, it, expect, vi } from "vitest"
import { createFixture, render } from "./render.js"
import { Text, Box, Widget } from "@termuijs/widgets"
import { useInput, useState } from "@termuijs/jsx"

function Hello() {
    return <text>Hello World</text>;
}

function MultiText() {
    return (
        <box>
            <text>One</text>
            <text>Two</text>
            <text>Three</text>
        </box>
    );
}

function InputComponent() {
    const [value, setValue] = useState("");

    useInput((input: string) => {
        setValue((prev: string) => prev + input);
    });

    return <text>{value}</text>;
}

function Counter() {
    const [count, setCount] = useState(0);

    useInput((input: string) => {
        if (input === "+") {
            setCount((prev: number) => prev + 1);
        }
    });

    return <text>Count: {count}</text>;
}

function Label(props: { text: string }) {
    return <text>{props.text}</text>;
}

class FakeWidget extends Widget {
    protected _renderSelf(): void {}
}

function FakeA11yWidget(props: { role?: string, label?: string }) {
    const box = new Box();
    if (props.role !== undefined) Reflect.set(box, "role", props.role);
    if (props.label !== undefined) Reflect.set(box, "label", props.label);
    return box;
}

describe("render harness", () => {
    describe("getByText", () => {
        it("returns a matching widget", () => {
            const screen = render(<Hello />);

            expect(screen.getByText("Hello")).toBeTruthy();
            expect(screen.getByText("World")).toBeTruthy();
        });

        it("returns null on miss", () => {
            const screen = render(<Hello />);

            expect(screen.getByText("Missing")).toBeNull();
        });
    });

    describe("getByRole", () => {
        it("returns the widget whose role prop matches the query", () => {
            const screen = render(<FakeA11yWidget role="button" />);
            const widget = screen.getByRole("button");
            expect(widget).toBeTruthy();
            expect(Reflect.get(widget!, "role")).toBe("button");
        });

        it("returns null when no node matches", () => {
            const screen = render(<FakeA11yWidget role="button" />);
            expect(screen.getByRole("link")).toBeNull();
        });
    });

    describe("getByLabelText", () => {
        it("returns the widget whose label prop matches the query", () => {
            const screen = render(<FakeA11yWidget label="Email" />);
            const widget = screen.getByLabelText("Email");
            expect(widget).toBeTruthy();
            expect(Reflect.get(widget!, "label")).toBe("Email");
        });

        it("returns null when no node matches", () => {
            const screen = render(<FakeA11yWidget label="Email" />);
            expect(screen.getByLabelText("Password")).toBeNull();
        });
    });

    describe("getAllByText", () => {
        it("returns all matching widgets", () => {
            const screen = render(<MultiText />);

            const matches = screen.getAllByText("o");

            expect(matches.length).toBeGreaterThan(0);
        });

        it("returns an empty array on miss", () => {
            const screen = render(<MultiText />);

            const matches = screen.getAllByText("Missing");

            expect(matches).toEqual([]);
        });
    });

    describe("getAllByType", () => {
        it("returns all widgets of a given type", () => {
            const screen = render(<MultiText />);

            const textWidgets = screen.getAllByType(Text);

            expect(textWidgets.length).toBe(3);
        });

        it("returns an empty array on miss", () => {
            const screen = render(<MultiText />);

            const widgets = screen.getAllByType(FakeWidget);

            expect(widgets).toEqual([]);
        });
    });

    describe("fireKey", () => {
        describe("pressKey", () => {
            it("aliases fireKey", () => {
                const screen = render(<Counter />);

                screen.pressKey("+");

                expect(screen.renderToString()).toContain("Count: 1");
            });
        });

        describe("pressKeys", () => {
            it("fires multiple keys", () => {
                const screen = render(<Counter />);

                screen.pressKeys(["+", "+", "+"]);

                expect(screen.renderToString()).toContain("Count: 3");
            });
        });

        describe("getOutput", () => {
            it("returns rendered output", () => {
                const screen = render(<Hello />);

                expect(screen.getOutput()).toContain("Hello World");
            });
        });
        
        it("delivers key events to rendered components", () => {
            const screen = render(<Counter />);

            expect(screen.renderToString()).toContain("Count: 0");

            screen.fireKey("+");

            expect(screen.renderToString()).toContain("Count: 1");
        });
    });

    describe("typeText", () => {
        it("types text into the component", () => {
            const screen = render(<InputComponent />);

            screen.typeText("hello");

            expect(screen.renderToString()).toContain("hello");
        });
    });

    describe("rerender", () => {
        it("updates the output after a prop change", () => {
            const screen = render(<Label text="Before" />);

            expect(screen.renderToString()).toContain("Before");

            screen.rerender(<Label text="After" />);

            expect(screen.renderToString()).toContain("After");
        });
    });

    describe("waitFor", () => {
        it("waits for assertions to pass", async () => {
            const screen = render(<Counter />);

            setTimeout(() => {
                screen.fireKey("+");
            }, 20);

            await screen.waitFor(() => {
                expect(screen.renderToString()).toContain("Count: 1");
            });
        });

        it("throws on timeout", async () => {
            const screen = render(<Hello />);

            await expect(
                screen.waitFor(
                    () => {
                        expect(screen.getByText("Never")).toBeTruthy();
                    },
                    {
                        timeout: 50,
                        interval: 10,
                    },
                ),
            ).rejects.toThrow("waitFor timed out");
        });
    });

    describe("renderToString", () => {
        it("renders the screen buffer as a string", () => {
            const screen = render(<Hello />);

            const output = screen.renderToString();

            expect(output).toContain("Hello World");
        });
    });

    describe("lastFrame", () => {
        it("returns the last rendered frame", () => {
            const screen = render(<Hello />);

            const frame = screen.lastFrame();

            expect(Array.isArray(frame)).toBe(true);
            expect(frame.join("\n")).toContain("Hello World");
        });
    });

    describe("toString", () => {
        it("returns rendered output as a string", () => {
            const screen = render(<Hello />);

            expect(screen.toString()).toContain("Hello World");
        });
    });

    describe("unmount", () => {
        it("unmounts cleanly without crashing", () => {
            const screen = render(<Hello />);

            expect(() => {
                screen.unmount();
            }).not.toThrow();
        });

        it("does not throw after unmount when firing keys", () => {
            const server = render(<Counter />);

            server.unmount();

            expect(() => {
                server.fireKey("+");
            }).not.toThrow();
        });
    });

    describe("createFixture", () => {
        it("applies default size when rendering without options", () => {
            const fixture = createFixture({ width: 40, height: 10 });

            const screen = fixture.render(<Hello />);

            expect(screen.screen.cols).toBe(40);
            expect(screen.screen.rows).toBe(10);

            fixture.cleanup();
        });

        it("allows per-call options to override defaults", () => {
            const fixture = createFixture({ width: 40, height: 10 });

            const screen = fixture.render(<Hello />, { width: 20, height: 5 });

            expect(screen.screen.cols).toBe(20);
            expect(screen.screen.rows).toBe(5);

            fixture.cleanup();
        });

        it("unmounts every tracked instance during cleanup", () => {
            const fixture = createFixture();
            const first = fixture.render(<Label text="First" />);
            const firstUnmount = vi.spyOn(first, "unmount");
            const second = fixture.render(<Label text="Second" />);
            const secondUnmount = vi.spyOn(second, "unmount");

            fixture.cleanup();

            expect(firstUnmount).toHaveBeenCalledOnce();
            expect(secondUnmount).toHaveBeenCalledOnce();
        });

        it("allows cleanup before any renders", () => {
            const fixture = createFixture();

            expect(() => {
                fixture.cleanup();
            }).not.toThrow();
        });
    });

    describe("queryByText", () => {
        it("returns null on a miss", () => {
            const screen = render(<Hello />);

            expect(screen.queryByText("Missing")).toBeNull();
        });

        it("returns the widget on a hit", () => {
            const screen = render(<Hello />);

            const result = screen.queryByText("Hello");

            expect(result).not.toBeNull();
        });

        it("does not throw on a miss", () => {
            const screen = render(<Hello />);

            expect(() => screen.queryByText("NotHere")).not.toThrow();
        });
    });

    describe("queryByType", () => {
        it("returns the first instance of a type", () => {
            const screen = render(<MultiText />);

            const result = screen.queryByType(Text);

            expect(result).not.toBeNull();
            expect(result instanceof Text).toBe(true);
        });

        it("returns null when no instance exists", () => {
            const screen = render(<MultiText />);

            const result = screen.queryByType(FakeWidget);

            expect(result).toBeNull();
        });

        it("does not throw when no instance exists", () => {
            const screen = render(<MultiText />);

            expect(() => screen.queryByType(FakeWidget)).not.toThrow();
        });
    });

    describe("queryAllByText", () => {
        it("returns all matching widgets", () => {
            const t = render(<MultiText />);
            const results = t.queryAllByText("o");
            expect(results.length).toBeGreaterThan(0);
        });

        it("returns empty array on miss", () => {
            const t = render(<Hello />);
            expect(t.queryAllByText("Missing")).toEqual([]);
        });

        it("does not throw on miss", () => {
            const t = render(<Hello />);
            expect(() => t.queryAllByText("Missing")).not.toThrow();
        });
    });

    describe("queryAllByType", () => {
        it("returns all widgets of a given type", () => {
            const t = render(<MultiText />);
            const results = t.queryAllByType(Text);
            expect(results.length).toBe(3);
        });

        it("returns empty array on miss", () => {
            const t = render(<MultiText />);
            expect(t.queryAllByType(FakeWidget)).toEqual([]);
        });

        it("does not throw on miss", () => {
            const t = render(<MultiText />);
            expect(() => t.queryAllByType(FakeWidget)).not.toThrow();
        });
    });

    describe("nested widget traversal", () => {
    it("queries work inside deeply nested widget trees", () => {
        const screen = render(
            <box>
                <box>
                    <box>
                        <text>Nested Hello</text>
                    </box>
                </box>
            </box>
        );

        const result = screen.getByText("Nested Hello");

        expect(result).toBeTruthy();

        // ✅ ensure correct widget type
        expect(result instanceof Text).toBe(true);

        // ✅ ensure correct content exists inside node
        expect(result?.toString?.()).toContain("Nested Hello");
    });
 });
});