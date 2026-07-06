const ANSI_REGEX = /\x1B\[[0-?]*[ -/]*[@-~]/g;



export function chalkToTermUI(input: string): string {
  if ('NO_COLOR' in process.env) {
    return input.replace(ANSI_REGEX, '')
  }

  return input
}