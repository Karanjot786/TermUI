import { describe, it, expect } from 'vitest';
import { Alert } from './index';
import type { AlertOptions } from './index';

describe('registry alert', () => {
  it('exports Alert component', () => {
    expect(typeof Alert).toBe('function');
  });

  it('exports AlertOptions type', () => {
    const options: AlertOptions = {
      type: 'info',
      message: 'Ready',
    };

    expect(options.message).toBe('Ready');
  });
});
