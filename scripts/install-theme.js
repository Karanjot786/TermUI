#!/usr/bin/env node
// ─────────────────────────────────────────────────────
// install-theme — Install a TermUI theme (SECURED VERSION)
// ─────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process';

/**
 * Validate theme name to prevent command injection
 * Allows: lowercase letters, numbers, hyphens, underscores
 * @throws Error if invalid
 */
function validateThemeName(name) {
  const VALID_THEME_RE = /^[a-z0-9_-]+$/;

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
 * Install a TermUI theme package
 * Uses execFileSync with argument arrays instead of shell string interpolation
 */
function installTheme(themeName) {
  try {
    validateThemeName(themeName);

    console.log(`Installing theme: ${themeName}...`);

    // Use execFileSync with argument array (safe from injection)
    const result = execFileSync('npm', ['install', `termui-theme-${themeName}`], {
      stdio: 'inherit',
      encoding: 'utf-8',
    });

    console.log(`✓ Theme "${themeName}" installed successfully`);
    return result;
  } catch (err) {
    if (err instanceof Error) {
      console.error(`✗ Failed to install theme: ${err.message}`);
    } else {
      console.error('✗ Failed to install theme');
    }
    process.exit(1);
  }
}

// Get theme name from command line arguments
const themeName = process.argv[2];

if (!themeName) {
  console.error('Usage: install-theme <theme-name>');
  console.error('Example: install-theme dark');
  process.exit(1);
}

installTheme(themeName);
