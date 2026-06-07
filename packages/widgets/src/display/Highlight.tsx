import React from 'react';
import { Text } from '@termuijs/core';

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

export const Highlight: React.FC<HighlightProps> = ({ 
  children, 
  query, 
  style = { backgroundColor: 'yellow', color: 'black' } 
}) => {
  if (!query) return <>{children}</>;

  const searchPattern = query instanceof RegExp ? query.source : query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const flags = query instanceof RegExp ? query.flags : 'gi';
  
  const parts = children.split(new RegExp(`(${searchPattern})`, flags));

  const isMatch = (part: string) =>
    typeof query === 'string'
      ? part.toLowerCase() === query.toLowerCase()
      : new RegExp(`^${query.source}$`, query.flags).test(part);

  return (
    <>
      {parts.map((part, i) =>
        isMatch(part) ? (
          <Text key={i} {...style}>{part}</Text>
        ) : (
          part
        )
      )}
    </>
  );
};
