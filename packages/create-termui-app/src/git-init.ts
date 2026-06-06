// ─────────────────────────────────────────────────────
// Git initialization for new projects (SECURED VERSION)
// ─────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process';
import { validateRepoName, validateProjectName } from './input-validation.js';

/**
 * Initialize git repository and configure remote
 * Uses execFileSync with argument arrays to prevent command injection
 */
export function initializeGitRepository(
  projectDir: string,
  projectName: string,
  repoUrl?: string
): void {
  // Validate project name
  validateProjectName(projectName);

  // If repoUrl provided, validate it follows expected format
  if (repoUrl) {
    validateGitUrl(repoUrl);
  }

  try {
    // Initialize git repository
    execFileSync('git', ['init'], {
      cwd: projectDir,
      stdio: 'inherit',
    });

    // Configure user (if not already set)
    try {
      execFileSync('git', ['config', 'user.name'], {
        cwd: projectDir,
        stdio: 'pipe',
      });
    } catch {
      execFileSync('git', ['config', 'user.name', 'TermUI User'], {
        cwd: projectDir,
        stdio: 'inherit',
      });
    }

    try {
      execFileSync('git', ['config', 'user.email'], {
        cwd: projectDir,
        stdio: 'pipe',
      });
    } catch {
      execFileSync('git', ['config', 'user.email', 'user@termui.dev'], {
        cwd: projectDir,
        stdio: 'inherit',
      });
    }

    // Add remote if URL provided
    if (repoUrl) {
      execFileSync('git', ['remote', 'add', 'origin', repoUrl], {
        cwd: projectDir,
        stdio: 'inherit',
      });
    }

    // Create initial commit
    execFileSync('git', ['add', '.'], {
      cwd: projectDir,
      stdio: 'inherit',
    });

    execFileSync('git', ['commit', '-m', 'Initial commit from create-termui-app'], {
      cwd: projectDir,
      stdio: 'inherit',
    });
  } catch (err) {
    // Git not available or operation failed
    console.warn('⚠ Git initialization failed (git may not be installed)');
  }
}

/**
 * Validate git URL to prevent injection
 * Accepts: git@github.com:user/repo.git, https://github.com/user/repo.git
 * @throws Error if URL is invalid
 */
function validateGitUrl(url: string): void {
  // Basic git URL validation - allow SSH and HTTPS formats only
  const isValidSsh = /^git@[a-z0-9.-]+:[a-z0-9_.-]+\/[a-z0-9_.-]+\.git$/.test(url);
  const isValidHttps = /^https:\/\/[a-z0-9.-]+\/[a-z0-9_.-]+\/[a-z0-9_.-]+\.git$/.test(url);

  if (!isValidSsh && !isValidHttps) {
    throw new Error(
      'Invalid git URL. Use format: git@github.com:user/repo.git or https://github.com/user/repo.git'
    );
  }
}
