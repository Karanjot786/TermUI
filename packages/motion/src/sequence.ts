export type AnimatableValue = number | string

export interface SequenceStep {
  target: AnimatableValue
  duration?: number
}

export function sequence(steps: SequenceStep[]): SequenceStep[] {
  return steps
}