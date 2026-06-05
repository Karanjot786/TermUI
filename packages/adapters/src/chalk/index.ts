import { createRequire } from 'node:module'


const ANSI_REGEX = /\x1B\[[0-?]*[ -/]*[@-~]/g;



export function ensureChalkInstalled(): void {
  try {
    const require = createRequire(import.meta.url)
    require('chalk')
  } catch (error) {
    throw new Error(
      'chalkToTermUI() requires the optional peer dependency `chalk`. Install `chalk` before using this adapter.',
      { cause: error }
    )
  }
}

export function chalkToTermUI(input: string): string {
  if ('NO_COLOR' in process.env) {
    return input.replace(ANSI_REGEX, '')
  }

  return input
}