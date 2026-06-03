/**
 * Supported border styles.
 */
export type BorderStyle =

  | 'none'
  | 'single'
  | 'double'

  | 'round'
  | 'heavy'
  | 'dashed'

  | 'custom';

export interface BorderChars {
  topLeft: string;
  top: string;
  topRight: string;
  right: string;
  bottomRight: string;
  bottom: string;
  bottomLeft: string;
  left: string;
}

export interface BorderOptions {
  style?: BorderStyle;
  color?: string;
  asciiOnly?: boolean;
}

/** Character maps for each border style */
export const BORDER_CHARS: Record<Exclude<BorderStyle, 'none' | 'custom'>, BorderChars> = {
  single: {
    topLeft: '┌', top: '─', topRight: '┐',
    right: '│', bottomRight: '┘', bottom: '─',
    bottomLeft: '└', left: '│',
  },
  double: {
    topLeft: '╔', top: '═', topRight: '╗',
    right: '║', bottomRight: '╝', bottom: '═',
    bottomLeft: '╚', left: '║',
  },
  round: {
    topLeft: '╭', top: '─', topRight: '╮',
    right: '│', bottomRight: '╯', bottom: '─',
    bottomLeft: '╰', left: '│',
  },
  heavy: {
    topLeft: '┏', top: '━', topRight: '┓',
    right: '┃', bottomRight: '┛', bottom: '━',
    bottomLeft: '┗', left: '┃',
  },
  dashed: {
    topLeft: '┌', top: '╌', topRight: '┐',
    right: '│', bottomRight: '┘', bottom: '╌',
    bottomLeft: '└', left: '│',
  }
};

/**
 * Retrieves the mapping characters for borders based on active properties.
 */
export function getBorderChars(style: BorderStyle, options?: BorderOptions): BorderChars | null {
  if (style === 'none') return null;

  // If the user passed asciiOnly or the environment blocks Unicode, use simple characters
  const useAsciiFallback = options?.asciiOnly || (globalThis as any).process?.env?.NO_UNICODE === '1';

  if (useAsciiFallback) {
    return {
      topLeft: '+', top: '-', topRight: '+',
      right: '|', bottomRight: '+', bottom: '-',
      bottomLeft: '+', left: '|'
    };
  }

  return BORDER_CHARS[style as Exclude<BorderStyle, 'none' | 'custom'>] || BORDER_CHARS.single;
}

export function borderSize(style: BorderStyle) {
  return style === 'none'
    ? { horizontal: 0, vertical: 0 }
    : { horizontal: 2, vertical: 2 };
}
