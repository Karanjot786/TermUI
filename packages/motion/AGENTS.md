# @termuijs/motion — agent notes

Read the root [AGENTS.md](../../AGENTS.md) first. This file adds motion-specific rules.

## What lives here

Spring and easing animations, transitions, sequencing (`sequence`, `parallel`), keyframes, and the shared interval timer pool (`timer-pool.ts`). Respects the `NO_MOTION` capability flag.

## Rules specific to motion

- Honor `caps.motion`. When motion is off, animations jump to their final state instead of stepping. Guard timer subscriptions with it.
- Use the shared timer pool (`timerPoolSubscribe`) rather than raw `setInterval` so many animations share one timer.
- Animation functions return a cancel function. Always return one, even for a no-op or empty input.
- Pure timing math (easing, interpolation) takes elapsed milliseconds and returns a value. Keep it side-effect free so it is trivial to test.

## Testing

- Mock `caps.motion` with `vi.spyOn(caps, 'motion', 'get').mockReturnValue(false)` and restore in `afterEach`.
- Test timing functions by calling them with explicit elapsed values. Do not rely on real time.
- Call `timerPoolUnsubscribeAll()` in teardown to avoid leaked timers across tests.

## Test command

```bash
bun vitest run packages/motion
```
