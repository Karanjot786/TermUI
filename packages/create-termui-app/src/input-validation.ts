// ─────────────────────────────────────────────────────
// Input validation utilities — prevent command injection
// ─────────────────────────────────────────────────────

// Theme name: lowercase letters, numbers, hyphens, underscores
const VALID_THEME_RE = /^[a-z0-9_-]+$/;

// Repository name: starts with lowercase/number, followed by lowercase/numbers/hyphens/underscores
const VALID_REPO_RE = /^[a-z0-9][a-z0-9_-]*$/;

// Project name: same rules as repo name
const VALID_PROJECT_NAME_RE = /^[a-z0-9][a-z0-9_-]*$/;

/**
 * Validate theme name
 * @throws Error if invalid
 */
export function validateThemeName(name: string): void {
  if (!name || name.length === 0) {
    throw new Error('Theme name cannot be empty');
  }
  if (name.length > 128) {
    throw new Error('Theme name too long (max 128 characters)');
  }
  if (!VALID_THEME_RE.test(name)) {
    throw new Error(
      'Invalid theme name. Only lowercase letters, numbers, hyphens and underscores are allowed.'
    );
  }
}

/**
 * Validate repository name
 * @throws Error if invalid
 */
export function validateRepoName(name: string): void {
  if (!name || name.length === 0) {
    throw new Error('Repository name cannot be empty');
  }
  if (name.length > 128) {
    throw new Error('Repository name too long (max 128 characters)');
  }
  if (!VALID_REPO_RE.test(name)) {
    throw new Error(
      'Invalid repository name. Must start with a letter or number, followed by lowercase letters, numbers, hyphens or underscores.'
    );
  }
  if (name === '..') {
    throw new Error('Invalid repository name: ".." is not allowed');
  }
}

/**
 * Validate project name
 * @throws Error if invalid
 */
export function validateProjectName(name: string): void {
  if (!name || name.length === 0) {
    throw new Error('Project name cannot be empty');
  }
  if (name.length > 128) {
    throw new Error('Project name too long (max 128 characters)');
  }
  if (!VALID_PROJECT_NAME_RE.test(name)) {
    throw new Error(
      'Invalid project name. Must start with a letter or number, followed by lowercase letters, numbers, hyphens or underscores.'
    );
  }
  if (name === '..') {
    throw new Error('Invalid project name: ".." is not allowed');
  }
}
