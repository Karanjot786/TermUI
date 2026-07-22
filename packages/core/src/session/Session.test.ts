import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { existsSync, mkdirSync, unlinkSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createSession } from './Session';

describe('Session', () => {
  // Use a temp directory inside the project instead of D:\tmp
  const testDir = join(process.cwd(), 'tmp-test-session');
  const testPath = join(testDir, 'termui-test-session.json');

  beforeEach(() => {
    // Create test directory if it doesn't exist
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    // Clean up any existing test file
    if (existsSync(testPath)) {
      unlinkSync(testPath);
    }
  });

  afterEach(() => {
    // Clean up test file after each test
    try {
      if (existsSync(testPath)) {
        unlinkSync(testPath);
      }
      // Remove the test directory after all tests
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch (_e) {
      // Ignore cleanup errors
    }
  });

  describe('Session', () => {
    it('stores and retrieves values', () => {
      const s = createSession({ storagePath: testPath });
      s.set('theme', 'dark');
      s.set('volume', 75);
      expect(s.get('theme')).toBe('dark');
      expect(s.get('volume')).toBe(75);
    });

    it('clear() removes all data', () => {
      const s = createSession({ storagePath: testPath });
      s.set('theme', 'dark');
      s.clear();
      expect(s.get('theme')).toBeUndefined();
    });

    it('autoSave starts and stopAutoSave clears interval', () => {
      const s = createSession({ storagePath: testPath, autoSave: true });
      expect(s.stopAutoSave).toBeDefined();
      s.stopAutoSave();
    });

    it('save() and restore() do not throw', () => {
      const s = createSession({ storagePath: testPath });
      s.set('theme', 'dark');
      expect(() => s.save()).not.toThrow();
      expect(() => s.restore()).not.toThrow();
    });
  });

  describe('Session persistence', () => {
    it('persists data to disk and restores it across instances', () => {
      const s1 = createSession({ storagePath: testPath });
      s1.set('theme', 'dark');
      s1.set('volume', 75);
      s1.save();

      const s2 = createSession({ storagePath: testPath });
      s2.restore();
      expect(s2.get('theme')).toBe('dark');
      expect(s2.get('volume')).toBe(75);
    });

    it('survives application restart cycle', () => {
      const s1 = createSession({ storagePath: testPath });
      s1.set('user', { name: 'alice', role: 'admin' });
      s1.save();

      const s2 = createSession({ storagePath: testPath });
      s2.restore();
      expect(s2.get('user')).toEqual({ name: 'alice', role: 'admin' });
    });

    it('handles corrupt JSON gracefully', () => {
      // Write corrupt JSON
      writeFileSync(testPath, 'not-valid-json', 'utf8');

      const s = createSession({ storagePath: testPath });
      s.restore(); // Should not throw, just ignore corrupt data
      expect(s.get('any-key')).toBeUndefined();
    });

    it('handles missing file gracefully on first run', () => {
      // Ensure file doesn't exist
      if (existsSync(testPath)) unlinkSync(testPath);
      
      const s = createSession({ storagePath: testPath });
      s.restore(); // Should not throw
      expect(s.get('any-key')).toBeUndefined();
    });
  });
});