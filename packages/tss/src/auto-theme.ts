// packages/tss/src/auto-theme.ts
//
// Detects the terminal background luminance to pick an appropriate theme.
// Uses a cascade of strategies in priority order so modern terminals
// (VS Code, Windows Terminal, iTerm2, Alacritty, Kitty, WezTerm) are
// handled correctly — not just xterm-compatible ones that set COLORFGBG.

import { createInterface } from 'node:readline'

export type TerminalBackground = 'dark' | 'light' | 'unknown'

/**
 * Detect terminal background luminance using multiple strategies in
 * priority order. Returns as soon as one strategy yields a definite result.
 *
 * Strategy 1: TERM_BACKGROUND env var — explicit user override
 * Strategy 2: COLORFGBG — xterm-compatible terminals
 * Strategy 3: TERM_PROGRAM — VS Code, iTerm2 heuristics
 * Strategy 4: OSC 11 query — modern terminals (async, 100ms timeout)
 *
 * @returns 'dark' | 'light' | 'unknown'
 */
export async function detectTerminalBackground(): Promise<TerminalBackground> {
  // ── Strategy 1: Explicit override (highest priority) ─────────────────────
  // Useful in CI, Docker, and terminals that support none of the
  // auto-detection strategies below.
  // Usage: TERM_BACKGROUND=dark npx my-app
  const override = process.env['TERM_BACKGROUND']
  if (override === 'dark' || override === 'light') {
    return override
  }

  // ── Strategy 2: COLORFGBG ─────────────────────────────────────────────────
  // Set by xterm, xterm-256color, rxvt, and some other X11 terminals.
  // Format: "foreground_index;background_index" e.g. "15;0" (white on black)
  // NOT set by: VS Code terminal, Windows Terminal, iTerm2 (default config),
  //             Alacritty, Kitty, WezTerm.
  const colorfgbg = process.env['COLORFGBG']
  if (colorfgbg) {
    const parts = colorfgbg.split(';')
    const bgIndex = parseInt(parts[parts.length - 1] ?? '', 10)
    if (!isNaN(bgIndex)) {
      // Palette indices 0–6 are standard dark colors
      // Palette indices 8–15 are high-intensity (light) colors
      // Index 7 is typically light gray — treat as light
      return bgIndex < 7 ? 'dark' : 'light'
    }
  }

  // ── Strategy 3: TERM_PROGRAM heuristics ───────────────────────────────────
  // TERM_PROGRAM is set by macOS Terminal.app, iTerm2, VS Code, and some
  // other terminal emulators. Uses known defaults + profile name inspection.
  const termProgram = process.env['TERM_PROGRAM']

  if (termProgram === 'vscode') {
    // VS Code integrated terminal defaults to dark theme.
    // The VSCODE_INJECTION env var confirms it's the actual VS Code terminal
    // rather than a terminal opened in a VS Code task with TERM_PROGRAM set.
    return 'dark'
  }

  if (termProgram === 'iTerm.app') {
    // iTerm2 sets ITERM_PROFILE with the active profile name.
    // Check for common light profile names.
    const profile = (process.env['ITERM_PROFILE'] ?? '').toLowerCase()
    const lightProfilePattern = /light|solarized.light|one.light|paper|github|daytime/
    if (lightProfilePattern.test(profile)) {
      return 'light'
    }
    // Default iTerm2 profiles (Default, Dark Background, etc.) are dark
    return 'dark'
  }

  if (termProgram === 'Apple_Terminal') {
    // macOS Terminal.app: "Basic", "Grass", "Homebrew", "Man Page",
    // "Novel", "Ocean", "Pro", "Red Sands", "Silver Aerogel", "Solid Colors"
    // Most defaults are dark. "Novel", "Silver Aerogel" are light.
    const profile = (process.env['TERM_PROGRAM_VERSION'] ?? '').toLowerCase()
    if (profile.includes('novel') || profile.includes('silver')) {
      return 'light'
    }
    return 'dark'
  }

  // ── Strategy 4: OSC 11 escape sequence query ──────────────────────────────
  // OSC 11 asks the terminal to report its background color.
  // Supported by: iTerm2, Windows Terminal, Alacritty, Kitty, WezTerm, xterm.
  // Not supported by: tmux (unless passthrough configured), some SSH sessions.
  // This is async with a 100ms timeout to avoid hanging non-supporting terminals.
  if (process.stdout.isTTY && process.stdin.isTTY) {
    const osc11Result = await queryOSC11BackgroundColor()
    if (osc11Result !== null) {
      return osc11Result
    }
  }

  return 'unknown'
}

/**
 * Send an OSC 11 escape sequence to query the terminal background color.
 * Returns 'dark' or 'light' based on the RGB luminance of the reported color,
 * or null if the terminal does not respond within the timeout or is not
 * a supported terminal.
 *
 * OSC 11 response format: \x1b]11;rgb:RRRR/GGGG/BBBB\x1b\\ or \x07 terminator
 * where RRRR/GGGG/BBBB are 16-bit hex values (0000–ffff).
 */
async function queryOSC11BackgroundColor(): Promise<TerminalBackground | null> {
  return new Promise<TerminalBackground | null>((resolve) => {
    const TIMEOUT_MS = 100
    let resolved = false

    const safeResolve = (value: TerminalBackground | null) => {
      if (resolved) return
      resolved = true
      cleanup()
      resolve(value)
    }

    // Set a timeout — if the terminal doesn't respond in 100ms, give up
    const timer = setTimeout(() => safeResolve(null), TIMEOUT_MS)

    // Buffer to accumulate the terminal's response
    let responseBuffer = ''

    // Put stdin into raw mode temporarily so we can read the escape response
    let wasRaw = false
    try {
      if (process.stdin.isTTY) {
        wasRaw = process.stdin.isRaw
        process.stdin.setRawMode(true)
      }
    } catch {
      // setRawMode can throw in some environments — bail out
      clearTimeout(timer)
      resolve(null)
      return
    }

    const onData = (chunk: Buffer | string) => {
      responseBuffer += chunk.toString()

      // OSC 11 response: ESC ] 11 ; rgb:RRRR/GGGG/BBBB ESC \  (or BEL \x07)
      const match = responseBuffer.match(
        /\x1b\]11;rgb:([0-9a-fA-F]{2,4})\/([0-9a-fA-F]{2,4})\/([0-9a-fA-F]{2,4})/
      )

      if (match) {
        // Parse the hex color components (normalize 8-bit to 16-bit if needed)
        const r = parseInt(match[1]!.padStart(4, '0'), 16) / 65535
        const g = parseInt(match[2]!.padStart(4, '0'), 16) / 65535
        const b = parseInt(match[3]!.padStart(4, '0'), 16) / 65535

        // Relative luminance (WCAG formula — same as @termuijs/core uses for WCAG utilities)
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b

        safeResolve(luminance < 0.5 ? 'dark' : 'light')
      }
    }

    const cleanup = () => {
      clearTimeout(timer)
      process.stdin.removeListener('data', onData)
      try {
        if (process.stdin.isTTY && !wasRaw) {
          process.stdin.setRawMode(false)
        }
      } catch {
        // Ignore cleanup errors
      }
    }

    process.stdin.on('data', onData)

    // Send the OSC 11 query: ESC ] 11 ; ? ESC \
    try {
      process.stdout.write('\x1b]11;?\x1b\\')
    } catch {
      safeResolve(null)
    }
  })
}