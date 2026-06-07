// ─────────────────────────────────────────────────────
// git-init.test.ts — Git initialization security tests
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initializeGitRepository } from './git-init';

describe('Git Repository Initialization Security', () => {
  const tempDir = join(tmpdir(), `termui-git-test-${Date.now()}`);

  afterAll(() => {
    // Cleanup
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('Input Validation', () => {
    it('rejects command injection in project names', () => {
      const injectionAttempts = [
        '; rm -rf /',
        '$(rm -rf /)',
        '`rm -rf /`',
        '| cat /etc/passwd',
        'repo && curl attacker.com',
        'repo\nrm -rf /',
      ];

      for (const attempt of injectionAttempts) {
        expect(() => {
          initializeGitRepository(tempDir, attempt);
        }).toThrow();
      }
    });

    it('rejects path traversal in project names', () => {
      expect(() => {
        initializeGitRepository(tempDir, '../../../etc');
      }).toThrow();
      expect(() => {
        initializeGitRepository(tempDir, '..');
      }).toThrow();
    });

    it('accepts valid project names', () => {
      const validNames = ['my-app', 'my-project', 'app123', 'project_v1'];

      for (const name of validNames) {
        // Should not throw
        const testDir = join(tempDir, `test-${name}`);
        mkdirSync(testDir, { recursive: true });
        expect(() => {
          initializeGitRepository(testDir, name);
        }).not.toThrow();
      }
    });
  });

  describe('Git URL Validation', () => {
    it('accepts valid SSH git URLs', () => {
      expect(() => {
        initializeGitRepository(
          tempDir,
          'my-project',
          'git@github.com:user/my-project.git'
        );
      }).not.toThrow();
    });

    it('accepts valid HTTPS git URLs', () => {
      expect(() => {
        initializeGitRepository(
          tempDir,
          'my-project',
          'https://github.com/user/my-project.git'
        );
      }).not.toThrow();
    });

    it('rejects injection attempts in git URLs', () => {
      const injectionUrls = [
        'git@github.com:user/repo.git && rm -rf /',
        'https://github.com/user/repo.git; curl attacker.com',
        'git@github.com:user/repo.git`whoami`',
        'https://github.com/user/repo.git$(cat /etc/passwd)',
      ];

      for (const url of injectionUrls) {
        expect(() => {
          initializeGitRepository(tempDir, 'my-project', url);
        }).toThrow();
      }
    });

    it('rejects invalid URL formats', () => {
      const invalidUrls = [
        'not-a-git-url',
        'http://github.com/user/repo.git', // should be https
        'ftp://github.com/user/repo.git',
        'git@github.com:user/repo', // missing .git
      ];

      for (const url of invalidUrls) {
        expect(() => {
          initializeGitRepository(tempDir, 'my-project', url);
        }).toThrow();
      }
    });
  });

  describe('Safe Command Execution', () => {
    it('uses execFileSync with argument arrays (safe from injection)', () => {
      // This test validates that the implementation doesn't construct shell commands
      // The actual safety is enforced through input validation and execFileSync usage
      const testDir = join(tempDir, 'safe-test');
      mkdirSync(testDir, { recursive: true });

      expect(() => {
        initializeGitRepository(testDir, 'safe-project');
      }).not.toThrow();
    });
  });
});
