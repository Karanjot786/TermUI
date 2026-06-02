import type { AnimatableValue, SequenceStep } from './sequence.js'
import { sequence } from './sequence.js'

export interface PathAnimationConfig {
  duration?: number
}

/**
 * Animates a value along a series of waypoints in sequence.
 */
export function pathAnimation(
  waypoints: AnimatableValue[],
  config?: PathAnimationConfig
): SequenceStep[] | null {
  if (!waypoints || waypoints.length === 0) {
    return null
  }

  const steps = waypoints.map(target => ({
    target,
    ...(config?.duration !== undefined ? { duration: config.duration } : {}),
  }))

  return sequence(steps)
}