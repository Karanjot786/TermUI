// ─────────────────────────────────────────────────────
// @termuijs/adapters — Tests for useExeca
// ─────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useExeca, useShell } from './index.js';
import { Readable } from 'node:stream';
import { execa } from 'execa';

vi.mock('execa', () => {
  return {
    execa: vi.fn(),
  };
});

interface MockError extends Error {
  exitCode: number;
}

interface MockChildResult {
  exitCode: number;
  all: Readable;
}

interface MockChild extends Promise<MockChildResult> {
  all: Readable;
  exitCode: number | null;
  killed: boolean;
  kill(): void;
}

describe('useExeca', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockChild(chunks: string[], exitCode = 0): MockChild {
    const stream = Readable.from(chunks);
    let rejectPromise: ((err: any) => void) | null = null;
    let resolvePromise: ((val: MockChildResult) => void) | null = null;

    const promise = new Promise<MockChildResult>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
      stream.on('end', () => {
        mockChild.exitCode = exitCode;
        if (exitCode === 0) {
          resolve({ exitCode, all: stream });
        } else {
          const err = new Error(`Command failed with exit code ${exitCode}`) as MockError;
          err.exitCode = exitCode;
          reject(err);
        }
      });
    });

    // Cast is necessary to assign the 'all' property to the promise
    const mockChild = Object.assign(promise, {
      all: stream,
      exitCode: null as number | null,
      killed: false,
      kill: () => {
        mockChild.killed = true;
        mockChild.exitCode = -1;
        stream.destroy();
        if (rejectPromise) {
          const err = new Error('Process was killed') as MockError;
          err.exitCode = -1;
          rejectPromise(err);
        }
      },
    }) as MockChild;
    return mockChild;
  }

  it('streams lines of stdout/stderr as they emit', async () => {
    const mockChild = createMockChild(['hello\nworld', '\nfoo\nbar\n']);
    // Cast to unknown and then to ReturnType<typeof execa> is needed to satisfy mock return type structure
    vi.mocked(execa).mockReturnValue(mockChild as unknown as ReturnType<typeof execa>);

    const { run } = useExeca();
    const lines: string[] = [];
    for await (const line of run('test-cmd', ['arg1'])) {
      lines.push(line);
    }

    expect(execa).toHaveBeenCalledWith('test-cmd', ['arg1'], {
      all: true,
      buffer: false,
    });
    expect(lines).toEqual(['hello', 'world', 'foo', 'bar']);
  });

  it('accepts command array', async () => {
    const mockChild = createMockChild(['ok\n']);
    // Cast to unknown and then to ReturnType<typeof execa> is needed to satisfy mock return type structure
    vi.mocked(execa).mockReturnValue(mockChild as unknown as ReturnType<typeof execa>);

    const { run } = useExeca();
    const lines: string[] = [];
    for await (const line of run(['my-cmd', 'arg1', 'arg2'], { env: { DEBUG: '1' } })) {
      lines.push(line);
    }

    expect(execa).toHaveBeenCalledWith('my-cmd', ['arg1', 'arg2'], {
      all: true,
      buffer: false,
      env: { DEBUG: '1' },
    });
    expect(lines).toEqual(['ok']);
  });

  it('merges global options with local options', async () => {
    const mockChild = createMockChild(['ok\n']);
    // Cast to unknown and then to ReturnType<typeof execa> is needed to satisfy mock return type structure
    vi.mocked(execa).mockReturnValue(mockChild as unknown as ReturnType<typeof execa>);

    const { run } = useExeca({ env: { GLOBAL: 'yes' }, timeout: 1000 });
    const iterator = run('my-cmd', { env: { LOCAL: 'yes' } });
    await iterator.next();

    expect(execa).toHaveBeenCalledWith('my-cmd', [], {
      all: true,
      buffer: false,
      env: { GLOBAL: 'yes', LOCAL: 'yes' },
      timeout: 1000,
    });
  });

  it('propagates errors when command fails with non-zero exit code', async () => {
    const mockChild = createMockChild(['some error\n'], 1);
    // Cast to unknown and then to ReturnType<typeof execa> is needed to satisfy mock return type structure
    vi.mocked(execa).mockReturnValue(mockChild as unknown as ReturnType<typeof execa>);

    const { run } = useExeca();
    const lines: string[] = [];

    const promise = (async () => {
      for await (const line of run('fail-cmd')) {
        lines.push(line);
      }
    })();

    await expect(promise).rejects.toThrow('Command failed with exit code 1');

    expect(lines).toEqual(['some error']);
  });

  it('kills the child process if the consumer exits the loop early', async () => {
    const mockChild = createMockChild(['line1\n', 'line2\n']);
    mockChild.exitCode = null;
    mockChild.killed = false;

    const killSpy = vi.spyOn(mockChild, 'kill');

    // Cast to unknown and then to ReturnType<typeof execa> is needed to satisfy mock return type structure
    vi.mocked(execa).mockReturnValue(mockChild as unknown as ReturnType<typeof execa>);

    const { run } = useExeca();

    for await (const line of run('test-cmd')) {
      expect(line).toBe('line1');
      break;
    }

    expect(killSpy).toHaveBeenCalled();
  });

  it('exposes useShell as an alias of useExeca', () => {
    expect(useShell).toBe(useExeca);
  });
});
