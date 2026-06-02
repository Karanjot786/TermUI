import type { AnimatableValue, SequenceStep } from './sequence.js'
import { sequence } from './sequence.js'

export interface PathAnimationConfig {
  duration?: number
}

export function pathAnimation(
  waypoints: AnimatableValue[],
  config?: PathAnimationConfig
): SequenceStep[] | null {
  if (!waypoints || waypoints.length === 0) {
    return null
  }

  const steps: SequenceStep[] = waypoints.map(target => ({
    target,
    ...(config?.duration !== undefined ? { duration: config.duration } : {}),
  }))

  return sequence(steps) as SequenceStep[]
}