export type AnimatableValue = number | string

export interface SequenceStep {
  target: AnimatableValue
  duration?: number
}

export type AnimationRunner = (done: () => void) => () => void

export type VirtualClock = {
  now(): number
  advance(ms: number): void
  tick(): void
  _setInterval(delayMs: number, cb: () => void): () => void
}

export function sequence(
  runners: AnimationRunner[] | SequenceStep[],
  onComplete?: () => void
): (() => void) | SequenceStep[] {
  // 1. Handle empty runners (always returns dummy cancel function)
  if (runners.length === 0) {
    onComplete?.()
    return () => {}
  }

  // 2. Handle SequenceStep[] path
  if (typeof runners[0] !== 'function') {
    onComplete?.()
    return runners as SequenceStep[]
  }

  // 3. Handle AnimationRunner[] path
  const fns = runners as AnimationRunner[]

  let cancelled = false
  let cancelCurrent: () => void = () => {}

  function runNext(index: number) {
    if (cancelled || index >= fns.length) {
      if (!cancelled) onComplete?.()
      return
    }
    cancelCurrent = fns[index](() => runNext(index + 1))
  }

  runNext(0)

  return () => {
    cancelled = true
    cancelCurrent()
  }
}

export function parallel(
  runners: AnimationRunner[],
  onComplete?: () => void
): () => void {
  if (runners.length === 0) {
    onComplete?.()
    return () => {}
  }

  let remaining = runners.length
  const cancellers: Array<() => void> = []

  for (const runner of runners) {
    const cancel = runner(() => {
      remaining--
      if (remaining === 0) onComplete?.()
    })
    cancellers.push(cancel)
  }

  return () => {
    cancellers.forEach(c => c())
  }
}

export interface RepeatOptions {
  /** Number of passes. Use Infinity for an endless loop. Default 1. */
  count?: number

  /** Reverse direction on every other pass. Default false. */
  yoyo?: boolean
}

export function repeat(
  runner: AnimationRunner,
  options?: RepeatOptions,
): AnimationRunner {
  const rawCount = options?.count ?? 1;
  if (rawCount !== Infinity && !(typeof rawCount === 'number' && Number.isInteger(rawCount) && rawCount >= 0)) {
    throw new TypeError(`repeat count must be a non-negative integer or Infinity, got ${rawCount}`);
  }
  const count = rawCount
  const yoyo = options?.yoyo ?? false

  return (done: () => void) => {
    if (count <= 0) {
      done()
      return () => {}
    }

    let cancelled = false
    let cancelCurrent: () => void = () => {}

    function runNext(index: number) {
      if (cancelled || index >= count) {
        if (!cancelled) done()
        return
      }

      // If a reversed runner is supplied, use it on odd passes.
      // Otherwise fall back to the original runner.
      const reverseRunner = (runner as { reverse?: AnimationRunner }).reverse
      const currentRunner = yoyo && index % 2 === 1 && reverseRunner
        ? reverseRunner
        : runner

      cancelCurrent = currentRunner(() => runNext(index + 1))
    }

    runNext(0)

    return () => {
      cancelled = true
      cancelCurrent()
    }
  }
}