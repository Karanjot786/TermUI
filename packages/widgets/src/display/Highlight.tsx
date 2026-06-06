import { h } from '@termuijs/jsx';
import { Text } from './Text.js';

export interface HighlightProps {
  children: string;
  query: string | RegExp;
  style?: any;
}

export const Highlight = ({ children, query, style = { backgroundColor: 'yellow', color: 'black' } }: HighlightProps) => {
  if (!query) return <>{children}</>;

  const parts = children.split(new RegExp(`(${query})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === (typeof query === 'string' ? query.toLowerCase() : '') ? (
          <Text key={i} {...style}>{part}</Text>
        ) : (
          part
        )
      )}
    </>
  );
};
