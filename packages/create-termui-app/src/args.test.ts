import { describe, it, expect } from "vitest";
import { parseArgs, isNonInteractive } from "./args";

describe("CLI args", () => {
    it("parses template and theme flags", () => {
        const res = parseArgs([
            "my-app",
            "--template",
            "dashboard",
            "--theme",
            "dark",
        ]);

        expect(res.name).toBe("my-app");
        expect(res.template).toBe("dashboard");
        expect(res.theme).toBe("dark");
    });

    it("supports --flag=value", () => {
        const res = parseArgs([
            "app",
            "--template=empty",
            "--theme=dark",
        ]);

        expect(res.template).toBe("empty");
        expect(res.theme).toBe("dark");
    });

    it("--yes enables non-interactive", () => {
        const res = parseArgs(["app", "--yes"]);
        expect(res.yes).toBe(true);
    });

    it("first positional becomes name", () => {
        const res = parseArgs(["my-app"]);
        expect(res.name).toBe("my-app");
    });

    it("isNonInteractive works", () => {
        expect(isNonInteractive(parseArgs(["app", "--yes"]))).toBe(true);
        expect(isNonInteractive(parseArgs(["app"]))).toBe(false);
    });
});