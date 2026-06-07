export interface HighlightStyle {
  backgroundColor?: string;
  color?: string;
  bold?: boolean;
}

export interface HighlightProps {
  children: string;
  query: string | RegExp;
  style?: HighlightStyle;
}

export const Highlight = ({
  children,
  query,
  style = { backgroundColor: 'yellow', color: 'black' }
}: HighlightProps) => {
  if (!query) return children as any;

  const searchPattern = query instanceof RegExp ? query.source : query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const flags = query instanceof RegExp ? query.flags : 'gi';

  const parts = children.split(new RegExp(`(${searchPattern})`, flags));

  // The exact logic requested by the maintainer:
  const isMatch = (part: string) =>
    typeof query === 'string'
      ? part.toLowerCase() === query.toLowerCase()
      : query.test(part);

  // Return the mapped array directly to avoid JSX fragment errors in TermUI
  return parts.map((part: string, i: number) =>
    isMatch(part) ? (
      <text key={i} {...style}>{part}</text>
    ) : (
      part
    )
  ) as any;
};
