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
  if (!query) return children;

  const searchPattern = query instanceof RegExp ? query.source : query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const flags = query instanceof RegExp ? query.flags : 'gi';
  
  const parts = children.split(new RegExp(`(${searchPattern})`, flags));

  const isMatch = (part: string) =>
    typeof query === 'string'
      ? part.toLowerCase() === query.toLowerCase()
      : new RegExp(`^${query.source}$`, query.flags).test(part);

  // Return the mapped array directly without wrapping it in an empty fragment
  return parts.map((part: string, i: number) =>
    isMatch(part) ? (
      <text key={i} {...style}>{part}</text>
    ) : (
      part
    )
  ) as any;
};
