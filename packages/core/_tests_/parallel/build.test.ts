/**
 * Build validation tests
 */

import { describe, test, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

describe('Parallel Build Validation', () => {
  test('parallel module should be built', () => {
    const distPath = join(__dirname, '../../dist/parallel/index.js');
    expect(existsSync(distPath)).toBe(true);
  });

  test('parallel types should be built', () => {
    const typesPath = join(__dirname, '../../dist/parallel/index.d.ts');
    expect(existsSync(typesPath)).toBe(true);
  });
});