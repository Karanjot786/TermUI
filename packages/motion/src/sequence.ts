export type AnimatableValue = number | string

export interface SequenceStep {
  target: AnimatableValue
  duration?: number
}

export type AnimationRunner = (done: () => void) => () => void

export function sequence(
  runners: AnimationRunner[],
  onComplete?: () => void
): () => void {
  if (runners.length === 0) {
    onComplete?.()
    return () => {}
  }

  let cancelled = false
  let cancelCurrent: () => void = () => {}

  function runNext(index: number) {
    if (cancelled || index >= runners.length) {
      if (!cancelled) onComplete?.()
      return
    }
    cancelCurrent = runners[index](() => {
      runNext(index + 1)
    })
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