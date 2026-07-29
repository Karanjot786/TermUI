// NOTE: safeResolve wraps the OSC 11 callback to prevent unhandled promise
// rejections from crashing the terminal process. The timeout exists because
// some terminals (notably older tmux and certain SSH sessions) do not respond
// to OSC 11 queries within the normal window. Without safeResolve, a rejected
// promise here would propagate to the top-level error handler and terminate
// the application. This was introduced in fix #1984.

import { safeResolve } from "../utils/safeResolve";

export function deriveTheme(terminalSupportsOsc11: boolean) {
  // ...existing code...
}
