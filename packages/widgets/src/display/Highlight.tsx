import { Style, parseColor } from '@termuijs/core';

export interface HighlightProps {
  children: string;
  query: string | RegExp;
  style?: Partial<Style>;
}

export const Highlight = ({
  children,
  query,
  style = { bg: parseColor('yellow'), fg: parseColor('black') }
}: HighlightProps) => {
  if (!query) return children as any;

  const searchPattern = query instanceof RegExp ? query.source : query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const flags = query instanceof RegExp ? query.flags : 'gi';

  const parts = children.split(new RegExp(`(${searchPattern})`, flags));

  const isMatch = (part: string) =>
    typeof query === 'string'
      ? part.toLowerCase() === query.toLowerCase()
      : query.test(part);

  return parts.map((part: string, i: number) =>
    isMatch(part) ? (
      <text key={i} {...style}>{part}</text>
    ) : (
      part
    )
  ) as any;
};