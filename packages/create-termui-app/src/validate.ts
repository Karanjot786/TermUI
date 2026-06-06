// ─────────────────────────────────────────────────────
// Project name validation to prevent path traversal attacks
// ─────────────────────────────────────────────────────

import { resolve } from "node:path";

// Regex allows: lowercase letters, numbers, hyphens, underscores
// Must start with a lowercase letter or number
const VALID_NAME_RE = /^[a-z0-9][a-z0-9_-]*$/;

/**
 * Validates a project name for security and npm compliance.
 * Prevents path traversal, absolute paths, and invalid characters.
 *
 * @param name - The project name to validate
 * @returns The validated name, or throws an error
 * @throws Error if name is invalid
 */
export function validateProjectName(name: unknown): string {
    // Check if name has the right type first
    if (typeof name !== "string") {
        throw new Error("Project name is required");
    }

    const trimmed = name.trim();

    // Check if empty after trim
    if (trimmed.length === 0) {
        throw new Error("Project name cannot be empty");
    }

    // Reject absolute paths (Unix and Windows)
    if (trimmed.startsWith("/") || trimmed.startsWith("\\")) {
        throw new Error(
            "Project name cannot be an absolute path"
        );
    }

    // Reject path traversal sequences and separators
    if (trimmed.includes("..") || trimmed.includes("/") || trimmed.includes("\\")) {
        throw new Error(
            "Project name cannot contain path separators or traversal sequences (/, \\, ..)"
        );
    }

    // Reject names that don't match the npm-safe pattern
    if (!VALID_NAME_RE.test(trimmed)) {
        throw new Error(
            "Project name must contain only lowercase letters, numbers, hyphens, and underscores, and start with a letter or number"
        );
    }

    return trimmed;
}

/**
 * Ensures the resolved project path remains within the current working directory.
 * This is a defensive check to prevent any path traversal bypasses.
 *
 * @param cwd - Current working directory
 * @param projectName - The validated project name
 * @throws Error if path traversal is detected
 */
export function validateResolvedPath(cwd: string, projectName: string): void {
    const resolved = resolve(cwd, projectName);

    // Normalize both paths for comparison
    const cwdNorm = resolve(cwd);

    // Check if the resolved path is within the current working directory
    if (!resolved.startsWith(cwdNorm + (cwdNorm.endsWith("/") || cwdNorm.endsWith("\\") ? "" : "/"))) {
        if (resolved !== cwdNorm) {
            // Allow the case where resolved equals cwd exactly
            throw new Error(
                `Security check failed: resolved path escapes current working directory`
            );
        }
    }
}
