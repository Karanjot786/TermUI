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

    it("skips scaffold flag values when finding the project name", () => {
        const res = parseArgs([
            "--template",
            "dashboard",
            "my-app",
            "--theme",
            "default",
        ]);

        expect(res.name).toBe("my-app");
        expect(res.template).toBe("dashboard");
        expect(res.theme).toBe("default");
    });

    it("skips inline scaffold flags when finding the project name", () => {
        const res = parseArgs([
            "--template=dashboard",
            "--theme=default",
            "my-app",
        ]);

        expect(res.name).toBe("my-app");
        expect(res.template).toBe("dashboard");
        expect(res.theme).toBe("default");
    });

    it("parses add command with component only", () => {
        const res = parseArgs(["add", "Badge"]);

        expect(res.command).toBe("add");
        expect(res.component).toBe("Badge");
        expect(res.dryRun).toBe(false);
        expect(res.dir).toBeUndefined();
        expect(res.yes).toBe(false);
    });

    it("parses add command with --dry-run", () => {
        const res = parseArgs(["add", "Badge", "--dry-run"]);

        expect(res.command).toBe("add");
        expect(res.component).toBe("Badge");
        expect(res.dryRun).toBe(true);
        expect(res.dir).toBeUndefined();
    });

    it("parses add command with --dir path", () => {
        const res = parseArgs(["add", "Badge", "--dir", "src/ui"]);

        expect(res.command).toBe("add");
        expect(res.component).toBe("Badge");
        expect(res.dir).toBe("src/ui");
        expect(res.dryRun).toBe(false);
    });

    it("does not treat a --dir value as the component name", () => {
        const res = parseArgs(["add", "--dir", "Badge"]);

        expect(res.command).toBe("add");
        expect(res.component).toBeUndefined();
        expect(res.dir).toBe("Badge");
    });

    it("parses a component that follows the --dir value", () => {
        const res = parseArgs(["add", "--dir", "src/ui", "Badge"]);

        expect(res.command).toBe("add");
        expect(res.component).toBe("Badge");
        expect(res.dir).toBe("src/ui");
    });

    it("accepts the form-wizard scaffold template", () => {
        const res = parseArgs(["my-app", "--template", "form-wizard"]);

        expect(res.template).toBe("form-wizard");
    });

    it("parses add command directory and --yes flag", () => {
        const res = parseArgs([
            "add",
            "Badge",
            "--dry-run",
            "--dir",
            "src/shared/components",
            "--yes",
        ]);

        expect(res.command).toBe("add");
        expect(res.component).toBe("Badge");
        expect(res.dryRun).toBe(true);
        expect(res.dir).toBe("src/shared/components");
        expect(res.yes).toBe(true);
    });

    it("rejects add command --dir without a path value", () => {
        expect(() => parseArgs(["add", "Badge", "--dir"])).toThrow(
            "--dir requires a value"
        );
    });

    it("rejects add command --dir followed by another flag", () => {
        expect(() => parseArgs(["add", "Badge", "--dir", "--dry-run"])).toThrow(
            "--dir requires a value"
        );
    });

    it("rejects add command --dir= without an inline path value", () => {
        expect(() => parseArgs(["add", "Badge", "--dir="])).toThrow(
            "--dir requires a value"
        );
    });

    it("isNonInteractive works", () => {
        expect(isNonInteractive(parseArgs(["app", "--yes"]))).toBe(true);
        expect(isNonInteractive(parseArgs(["app"]))).toBe(false);
        expect(isNonInteractive(parseArgs(["app", "--template", "dashboard", "--theme", "default"]))).toBe(true);
        expect(isNonInteractive(parseArgs(["app", "--template", "dashboard"]))).toBe(false);
    });

    it("throws error for invalid template key", () => {
        expect(() => parseArgs(["app", "--template", "invalid-template"])).toThrow(
            'Invalid template "invalid-template". Valid: empty, dashboard, interactive-tool, cli-wrapper, cli-tool, file-manager, ai-assistant, form-wizard'
        );
    });
    it('parses --version', () => {
        const res = parseArgs(['--version']);

        expect(res.version).toBe(true);
    });

    it('parses -v', () => {
        const res = parseArgs(['-v']);

        expect(res.version).toBe(true);
    });
});
