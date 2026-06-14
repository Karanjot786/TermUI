// ─────────────────────────────────────────────────────
// @termuijs/adapters — execa integration
// ─────────────────────────────────────────────────────

import type { Options } from 'execa';
import { execa } from 'execa';

export interface UseExecaResult {
  run(
    cmd: string | string[],
    argsOrOpts?: string[] | Options,
    opts?: Options
  ): AsyncGenerator<string, void, unknown>;
}

let _execaModule: typeof import('execa') | undefined;

/**
 * Lazily loads the execa module.
 */
async function getExeca(): Promise<typeof import('execa')> {
  if (_execaModule) return _execaModule;
  try {
    _execaModule = await import('execa');
    return _execaModule;
  } catch (err) {
    throw new Error(
      'useExeca() requires the optional peer dependency `execa`. ' +
        'Please install `execa@^8.0.0` or newer in your project before using useExeca().',
      { cause: err }
    );
  }
}

function isExecaCallable(obj: unknown): obj is typeof execa {
  return typeof obj === 'function';
}

function isExecaModuleWithExeca(obj: unknown): obj is { execa: typeof execa } {
  return typeof obj === 'object' && obj !== null && 'execa' in obj && typeof (obj as { execa: unknown }).execa === 'function';
}

function isExecaModuleWithDefault(obj: unknown): obj is { default: typeof execa } {
  return typeof obj === 'object' && obj !== null && 'default' in obj && typeof (obj as { default: unknown }).default === 'function';
}

function isOptions(obj: unknown): obj is Options {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

/**
 * Hook to execute external commands using execa.
 * Streams stdout and stderr interleaved as an AsyncIterable of lines.
 */
export function useExeca(globalOpts?: Options): UseExecaResult {
  return {
    async *run(
      cmd: string | string[],
      argsOrOpts?: string[] | Options,
      opts?: Options
    ): AsyncGenerator<string, void, unknown> {
      const execaModule: unknown = await getExeca();
      let execaFn: typeof execa;

      if (isExecaModuleWithExeca(execaModule)) {
        execaFn = execaModule.execa;
      } else if (isExecaModuleWithDefault(execaModule)) {
        execaFn = execaModule.default;
      } else if (isExecaCallable(execaModule)) {
        execaFn = execaModule;
      } else {
        throw new Error('useExeca: Resolved execa module is not callable.');
      }

      let file: string;
      let args: string[] = [];
      let options: Options = {};

      if (Array.isArray(cmd)) {
        if (cmd.length === 0) {
          throw new Error('useExeca: Command array must not be empty.');
        }
        file = cmd[0];
        args = cmd.slice(1);
        if (isOptions(argsOrOpts)) {
          options = argsOrOpts;
        }
      } else {
        file = cmd;
        if (Array.isArray(argsOrOpts)) {
          args = argsOrOpts;
          options = opts ?? {};
        } else if (isOptions(argsOrOpts)) {
          options = argsOrOpts;
        }
      }

      const mergedOpts: Options = {
        ...globalOpts,
        ...options,
        all: true,
        buffer: false,
        env: (globalOpts?.env || options?.env) ? {
          ...globalOpts?.env,
          ...options?.env,
        } : undefined,
      };

      // child is typed as any to support all dynamic overloads returned by execaFn at runtime
      let child: any;
      try {
        child = execaFn(file, args, mergedOpts);
        const stream = child.all;
        if (!stream) {
          throw new Error('useExeca: stdout/stderr stream (child.all) is not available.');
        }

        let buffer = '';
        for await (const chunk of stream) {
          const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
          buffer += chunkStr;
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            yield line;
          }
        }
        if (buffer) {
          yield buffer;
        }

        await child;
      } finally {
        if (child) {
          if (child.exitCode === null && !child.killed) {
            child.kill();
          }
          try {
            await child;
          } catch {
            // Ignore error on cleanup if the consumer exited early
          }
        }
      }
    },
  };
}

/**
 * Convenience alias for useExeca.
 */
export const useShell = useExeca;
