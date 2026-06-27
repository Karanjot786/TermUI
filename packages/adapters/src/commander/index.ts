import type { Command } from 'commander'

export interface CommanderResult<T extends Record<string, unknown> = Record<string, unknown>> {
  options: T
  args: string[]
}

export function useCommander<T extends Record<string, unknown> = Record<string, unknown>>(
  program: Command,
  argv?: string[]
): CommanderResult<T> {
  program.parse(argv ?? process.argv)
  return {
    options: program.opts() as T, // Commander options bag is untyped at runtime; casting to caller-specified generic shape T
    args: program.args,
  }
}