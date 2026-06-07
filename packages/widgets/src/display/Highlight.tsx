import { type Style, parseColor, stringWidth } from '@termuijs/core';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

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
  if (!query) {
    return (
      <box flexDirection="row">
        <text width={stringWidth(children)} height={1}>{children}</text>
      </box>
    );
  }

  const pattern = query instanceof RegExp ? query.source : escapeRegExp(query);
  const baseFlags = query instanceof RegExp ? query.flags : 'i';
  const splitFlags = baseFlags.includes('g') ? baseFlags : `${baseFlags}g`;
  const splitRegex = new RegExp(`(${pattern})`, splitFlags);
  const exactMatchRegex = new RegExp(`^(?:${pattern})$`, baseFlags.replace(/g/g, ''));

  const parts = children.split(splitRegex);

  return (
    <box flexDirection="row">
      {parts.map((part: string, i: number) => (
        <text
          key={i}
          width={stringWidth(part)}
          height={1}
          style={exactMatchRegex.test(part) ? style : undefined}
        >
          {part}
        </text>
      ))}
    </box>
  );
};
