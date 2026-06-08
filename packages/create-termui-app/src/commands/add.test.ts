import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";

vi.mock("node:child_process", () => ({
    execFileSync: vi.fn(),
}));

import * as childProcess from "node:child_process";
import { runAddCommand } from "./add";

const registrySchema = {
    components: [
        {
            name: "badge",
            category: "utility",
            description:
                "Short inline label with colored background for status indicators.",
            files: ["registry/components/badge/index.ts"],
            deps: ["@termuijs/core", "@termuijs/widgets"],
            peerDeps: [],
            version: "0.1.0",
        },
    ],
};

let originalFetch: typeof fetch;

function setupFetchMock() {
    const mockFetch = vi.fn(async (url: string) => {
        if (url.endsWith("/registry/schema.json")) {
            return {
                ok: true,
                json: async () => registrySchema,
            } as any;
        }

        if (url.endsWith("/registry/components/badge/index.ts")) {
            return {
                ok: true,
                text: async () => 'export const Badge = () => "badge";',
            } as any;
        }

        return {
            ok: false,
            status: 404,
            statusText: "Not Found",
        } as any;
    });

    globalThis.fetch = mockFetch as any;
    return mockFetch;
}

describe("runAddCommand", () => {
    const originalCwd = process.cwd();
    let tempDir: string;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
        tempDir = join(
            tmpdir(),
            `termui-add-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        );
        mkdirSync(tempDir, { recursive: true });
        process.chdir(tempDir);
    });

    afterEach(() => {
        process.chdir(originalCwd);
        rmSync(tempDir, { recursive: true, force: true });
        globalThis.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    it("throws when component is not found and prints available list", async () => {
        setupFetchMock();
        const logSpy = vi
            .spyOn(console, "log")
            .mockImplementation(() => undefined);

        await expect(
            runAddCommand({ component: "Unknown", dryRun: true }),
        ).rejects.toThrow('Component "Unknown" not found in registry.');

        expect(logSpy).toHaveBeenCalledWith("Available registry components:");
        expect(logSpy).toHaveBeenCalledWith("  - badge");
    });

    it("shows dry-run preview without writing files or installing packages", async () => {
        setupFetchMock();
        const logSpy = vi
            .spyOn(console, "log")
            .mockImplementation(() => undefined);
        const execSpy = vi.spyOn(childProcess, "execFileSync");

        await runAddCommand({ component: "Badge", dryRun: true });

        const destination = join(
            tempDir,
            "src",
            "components",
            "badge",
            "index.ts",
        );
        expect(existsSync(destination)).toBe(false);
        expect(logSpy).toHaveBeenCalledWith(
            "Dry run preview — no files will be written.",
        );
        expect(execSpy).not.toHaveBeenCalled();
    });

    it("downloads component files and installs deps on successful add", async () => {
        setupFetchMock();
        const logSpy = vi
            .spyOn(console, "log")
            .mockImplementation(() => undefined);
        const execSpy = vi.spyOn(childProcess, "execFileSync");

        await runAddCommand({ component: "Badge" });

        const destination = join(
            tempDir,
            "src",
            "components",
            "badge",
            "index.ts",
        );
        expect(existsSync(destination)).toBe(true);
        expect(readFileSync(destination, "utf-8")).toBe(
            'export const Badge = () => "badge";',
        );
        expect(execSpy).toHaveBeenCalledWith(
            "bun",
            ["add", "@termuijs/core", "@termuijs/widgets"],
            {
                stdio: "inherit",
            },
        );
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining("added successfully"),
        );
    });

    it("resolves component names case-insensitively", async () => {
        setupFetchMock();
        vi.spyOn(childProcess, "execFileSync");

        await runAddCommand({ component: "BaDGe" });

        const destination = join(
            tempDir,
            "src",
            "components",
            "badge",
            "index.ts",
        );
        expect(existsSync(destination)).toBe(true);
        expect(readFileSync(destination, "utf-8")).toContain("Badge");
    });
});
