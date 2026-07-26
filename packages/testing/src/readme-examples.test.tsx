/** @jsxImportSource @termuijs/jsx */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "./render.js";
import { Box, Text } from "@termuijs/widgets";
import { useState, useKeymap, ErrorBoundary } from "@termuijs/jsx";

describe("README Examples", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Manual Setup Example (Counter)", () => {
        function Counter() {
            const [count, setCount] = useState(0);

            useKeymap([
                { key: "+", action: () => setCount((c) => c + 1) },
                { key: "c", ctrl: true, action: () => process.exit(0) },
            ]);

            return (
                <Box border="round" padding={1}>
                    <Text bold>Count: {count}</Text>
                    <Text dim>Press + to increment, ctrl+c to quit</Text>
                </Box>
            );
        }

        it("renders the Counter example, increments on '+', and exits on ctrl+c", () => {
            const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

            const t = render(<Counter />);

            // Initial render verification
            const outputInitial = t.renderToString();
            expect(outputInitial).toContain("Count: 0");
            expect(outputInitial).toContain("Press + to increment, ctrl+c to quit");

            // Key interaction verification
            t.fireKey("+");
            expect(t.renderToString()).toContain("Count: 1");

            // Exit key verification
            t.fireKey("c", { ctrl: true });
            expect(exitSpy).toHaveBeenCalledWith(0);

            t.unmount();
        });
    });

    describe("ErrorBoundary Example", () => {
        function Dashboard() {
            throw new Error("Dashboard error");
        }

        it("renders fallback message when a component within ErrorBoundary throws", () => {
            const t = render(
                <ErrorBoundary fallback={(err) => <Text color="red">Error: {err.message}</Text>}>
                    <Dashboard />
                </ErrorBoundary>
            );

            expect(t.renderToString()).toContain("Error: Dashboard error");

            t.unmount();
        });
    });

    describe("useKeymap Example", () => {
        it("triggers actions for registered key configurations", () => {
            const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
            let saveCalled = false;
            let searchCalled = false;
            let helpCalled = false;

            const save = () => { saveCalled = true; };
            const openSearch = () => { searchCalled = true; };
            const showHelp = () => { helpCalled = true; };

            function App() {
                useKeymap([
                    { key: "c", ctrl: true, action: () => process.exit(0) },
                    { key: "s", ctrl: true, action: () => save() },
                    { key: "/", action: () => openSearch() },
                    { key: "?", action: () => showHelp() },
                ]);
                return <Box>Keymap Container</Box>;
            }

            const t = render(<App />);
            expect(t.renderToString()).toContain("Keymap Container");

            t.fireKey("s", { ctrl: true });
            expect(saveCalled).toBe(true);

            t.fireKey("/");
            expect(searchCalled).toBe(true);

            t.fireKey("?");
            expect(helpCalled).toBe(true);

            t.fireKey("c", { ctrl: true });
            expect(exitSpy).toHaveBeenCalledWith(0);

            t.unmount();
        });
    });
});
