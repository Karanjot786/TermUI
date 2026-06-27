import { caps } from '@termuijs/core'

export type ProgressBarStyle = 'blocks' | 'line' | 'dots'

export interface ProgressStringProps {
  value: number
  width?: number
  style?: ProgressBarStyle
  color?: string
  showPercent?: boolean
}

const UNICODE = { blocks: ['█','░'], line: ['─',' '], dots: ['●','○'] }
const ASCII   = { blocks: ['#','-'], line: ['-',' '], dots: ['*','.'] }

function colorize(text: string, color?: string): string {
  if (!color) return text
  const codes: Record<string,string> = {
    green:'\x1b[32m', red:'\x1b[31m', blue:'\x1b[34m',
    yellow:'\x1b[33m', cyan:'\x1b[36m', white:'\x1b[37m',
  }
  return `${codes[color] ?? ''}${text}\x1b[0m`
}

export const ProgressString = {
  render({ value, width = 40, style = 'blocks', color, showPercent = false }: ProgressStringProps): string {
    const v = Math.max(0, Math.min(100, value))
    const set = caps.unicode ? UNICODE[style] : ASCII[style]
    const barWidth = showPercent ? width - 5 : width
    const filled = Math.round((v / 100) * barWidth)
    const empty  = barWidth - filled
    const bar    = colorize(set[0].repeat(filled), color) + set[1].repeat(empty)
    const pct    = showPercent ? ` ${String(Math.round(v)).padStart(3)}%` : ''
    return `${bar}${pct}`
  }
}