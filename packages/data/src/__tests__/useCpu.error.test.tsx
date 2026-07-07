/** @jsxImportSource @termuijs/jsx */
// packages/data/src/__tests__/useCpu.error.test.tsx
// Tests for Issue #2119: hook must return error state on polling failure
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@termuijs/testing';
import { useCpu } from '../hooks/useCpu';

// ── Mock state ──────────────────────────────────────────────────────────────
// These variables control what the mock `cpu` module returns.
let mockPercent = 0;
let mockCores: number[] = [];
let mockError: Error | null = null;

// ── Mock the `cpu` module ──────────────────────────────────────────────────
// The hook imports `{ cpu } from '../cpu.js'`
vi.mock('../cpu.js', () => ({
  cpu: {
    get percent() {
      if (mockError) throw mockError;
      return mockPercent;
    },
    get perCore() {
      if (mockError) throw mockError;
      return mockCores;
    },
  },
}));
// ─────────────────────────────────────────────────────────────────────────────

// ── Helper component ──────────────────────────────────────────────────────────
function CpuConsumer({ interval = 100 }: { interval?: number }) {
  const cpu = useCpu(interval);
  if (cpu.error) {
    return `ERROR:${cpu.error.message}`;
  }
  return `CPU:${cpu.usage}`;
}
// ─────────────────────────────────────────────────────────────────────────────

describe('useCpu error handling (Issue #2119)', () => {
  beforeEach(() => {
    // Reset mock state before each test
    mockPercent = 0;
    mockCores = [];
    mockError = null;
    vi.clearAllMocks();
  });

  it('returns { error: null } on successful poll', async () => {
    mockPercent = 42.5;
    mockCores = [40, 45];

    const t = render(<CpuConsumer interval={50} />);
    await t.waitFor(() => {
      expect(t.getByText('CPU:42.5')).toBeTruthy();
    });
    t.unmount();
  });

  it('returns { error: Error } and keeps last values when getters throw EPERM', async () => {
    const error = Object.assign(new Error('Operation not permitted'), { code: 'EPERM' });
    mockError = error;

    const t = render(<CpuConsumer interval={50} />);
    await t.waitFor(() => {
      expect(t.getByText('ERROR:Operation not permitted')).toBeTruthy();
    });
    t.unmount();
  });

  it('returns { error: Error } when getters throw EACCES', async () => {
    const error = Object.assign(new Error('Permission denied'), { code: 'EACCES' });
    mockError = error;

    const t = render(<CpuConsumer interval={50} />);
    await t.waitFor(() => {
      expect(t.getByText('ERROR:Permission denied')).toBeTruthy();
    });
    t.unmount();
  });

  it('clears error state when polling recovers after a transient failure', async () => {
    // First call fails, second succeeds
    let callCount = 0;
    // We need to manipulate the mock dynamically per call.
    // We can't use a simple variable because the getter is called multiple times.
    // So we'll temporarily override the getter implementations inside the test.
    // But we can also achieve this by using a counter in the mock itself.
    // Simpler: we'll define a variable that tracks attempts.
    let attempts = 0;
    // We'll override the mockError and mockPercent per attempt by using a closure.
    // Since we can't easily change the getter after mock creation, we'll use a
    // global variable that changes.
    // Use a flag that toggles after first call.
    let firstCall = true;
    // Re-define the getters for this test only.
    // We can do that by re-assigning the mock module, but easier: we'll use a
    // different approach: we'll set mockError initially, then clear it.
    // But that's not per call. We'll use a custom implementation using vi.doMock?
    // Actually, we can use a simple counter and throw on first call.
    // The easiest: use a variable that we increment.
    // However, the getters are evaluated each time, so we can check a counter.
    // We'll use a module-level variable that we control.
    // We'll override the mock directly.
    // Better: we can define a spy that throws on first call.
    // Since we have access to the mock, we can replace it.
    // But to keep it clean, we'll use a different approach:
    // We'll set mockError and then clear it after a delay? Not good.
    // We'll use the mock's ability to be re-defined.
    // Let's just use a simple counter inside the test:
    let count = 0;
    // We'll temporarily replace the getter functions.
    const originalPercent = Object.getOwnPropertyDescriptor(
      (await import('../cpu.js')).cpu,
      'percent'
    );
    const originalCores = Object.getOwnPropertyDescriptor(
      (await import('../cpu.js')).cpu,
      'perCore'
    );

    // Override with custom logic
    const cpuModule = await import('../cpu.js');
    Object.defineProperty(cpuModule.cpu, 'percent', {
      get: () => {
        count++;
        if (count === 1) throw new Error('Transient failure');
        return 55.0;
      },
      configurable: true,
    });
    Object.defineProperty(cpuModule.cpu, 'perCore', {
      get: () => {
        if (count === 1) throw new Error('Transient failure');
        return [50, 60];
      },
      configurable: true,
    });

    const t = render(<CpuConsumer interval={50} />);

    // First: error state
    await t.waitFor(() => {
      expect(t.getByText('ERROR:Transient failure')).toBeTruthy();
    });

    // Then: recovers and shows real data
    await t.waitFor(() => {
      expect(t.getByText('CPU:55')).toBeTruthy();
    });
    t.unmount();

    // Restore original getters (optional)
    if (originalPercent) {
      Object.defineProperty(cpuModule.cpu, 'percent', originalPercent);
    }
    if (originalCores) {
      Object.defineProperty(cpuModule.cpu, 'perCore', originalCores);
    }
  });
});