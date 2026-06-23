export interface TooltipProps {
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  children: string
  animationDuration?: number
}

export interface TooltipState {
  visible: boolean
  opacity: number
}

export function createTooltip(props: TooltipProps): {
  show: () => void
  hide: () => void
  getState: () => TooltipState
} {
  const duration = props.animationDuration ?? 150
  const steps = 10
  const interval = duration / steps

  let visible = false
  let opacity = 0
  let timer: ReturnType<typeof setInterval> | null = null

  const clearTimer = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  const show = () => {
    clearTimer()
    visible = true
    let step = 0
    timer = setInterval(() => {
      step++
      opacity = step / steps
      if (step >= steps) {
        opacity = 1
        clearTimer()
      }
    }, interval)
  }

  const hide = () => {
    clearTimer()
    let step = steps
    timer = setInterval(() => {
      step--
      opacity = step / steps
      if (step <= 0) {
        opacity = 0
        visible = false
        clearTimer()
      }
    }, interval)
  }

  const getState = (): TooltipState => ({ visible, opacity })

  return { show, hide, getState }
}

export const Tooltip = {
  create: createTooltip,
}

export default Tooltip
