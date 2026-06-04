#!/usr/bin/env node
// ─────────────────────────────────────────────────────
// generate-docs — Generate documentation (SECURED VERSION)
// ─────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * Validate documentation target to prevent command injection
 * Allows: lowercase letters, numbers, hyphens, underscores, forward slashes
 * @throws Error if invalid
 */
function validateDocTarget(target) {
  // Basic validation: no shell metacharacters
  const VALID_DOC_TARGET_RE = /^[a-z0-9_/-]+$/;

  if (!target || target.length === 0) {
    throw new Error('Documentation target cannot be empty');
  }

  if (target.length > 256) {
    throw new Error('Documentation target too long (max 256 characters)');
  }

  // Reject path traversal attempts
  if (target.includes('..')) {
    throw new Error('Documentation target cannot contain ".."');
  }

  if (!VALID_DOC_TARGET_RE.test(target)) {
    throw new Error(
      'Invalid documentation target. Only lowercase letters, numbers, hyphens, underscores and forward slashes are allowed.'
    );
  }
}

/**
 * Generate documentation from source
 * Uses execFileSync with separate commands to prevent injection
 */
function generateDocs(target) {
  try {
    validateDocTarget(target);

    console.log(`Generating documentation for: ${target}...`);

    // Use execFileSync with argument array (safe from injection)
    // Run TypeScript compiler on source
    execFileSync('tsc', ['--noEmit'], {
      stdio: 'inherit',
      encoding: 'utf-8',
    });

    // Generate documentation using typedoc (if available)
    try {
      execFileSync('typedoc', ['--out', join('docs', target), 'src'], {
        stdio: 'inherit',
        encoding: 'utf-8',
      });
      console.log(`✓ Documentation generated at: docs/${target}`);
    } catch (err) {
      // typedoc not available, try alternative
      console.log('📝 TypeDoc not available, generating from JSDoc comments instead');
      execFileSync('jsdoc', ['-d', join('docs', target), 'src/**/*.ts'], {
        stdio: 'inherit',
        encoding: 'utf-8',
      });
      console.log(`✓ Documentation generated at: docs/${target}`);
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error(`✗ Failed to generate documentation: ${err.message}`);
    } else {
      console.error('✗ Failed to generate documentation');
    }
    process.exit(1);
  }
}

// Get target from command line arguments or use default
const target = process.argv[2] || 'api';

generateDocs(target);
