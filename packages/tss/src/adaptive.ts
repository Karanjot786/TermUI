import { caps } from '@termuijs/core';

export interface AdaptiveColor {
  light: string;
  dark: string;
}

export function adaptive(colors: AdaptiveColor): string {
  return caps.background === 'light' ? colors.light : colors.dark;
}
