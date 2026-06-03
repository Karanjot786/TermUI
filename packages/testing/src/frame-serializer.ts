/**
 * A Vitest snapshot serializer that renders a frame (the string[] from
 * lastFrame()) as a bordered grid. Register in a setup file or pass to
 * expect.addSnapshotSerializer.
 */

/** Format a frame as a bordered grid string. */
export function formatFrame(frame: string[]): string {
  if (frame.length === 0) {
    return '┌┐\n└┘';
  }

  const width = Math.max(...frame.map((row) => row.length));

  const top    = '┌' + '─'.repeat(width) + '┐';
  const bottom = '└' + '─'.repeat(width) + '┘';
  const rows   = frame.map((row) => '│' + row.padEnd(width, ' ') + '│');

  return [top, ...rows, bottom].join('\n');
}

/** Vitest snapshot serializer for terminal frames. */
export const frameSerializer: {
  test(value: unknown): boolean;
  serialize(value: string[]): string;
} = {
  test(value: unknown): boolean {
    return (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
    );
  },

  serialize(value: string[]): string {
    return formatFrame(value);
  },
};