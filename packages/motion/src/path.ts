import type { AnimatableValue } from './sequence.js'

export interface PathAnimationConfig {
  duration?: number
}

export interface PathAnimationResult {
  type: 'path'
  waypoints: AnimatableValue[]
  config?: PathAnimationConfig
}

/**
 * Animates a value along a series of waypoints in sequence.
 */
export function pathAnimation(
  waypoints: AnimatableValue[],
  config?: PathAnimationConfig
): PathAnimationResult | null {
  if (!waypoints || waypoints.length === 0) {
    return null
  }

  return {
    type: 'path',
    waypoints,
    config,
  }
}