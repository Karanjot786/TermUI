// packages/router/src/DefaultNotFound.tsx
// New file for Issue #2120 — default fallback rendered when no route matches

import { Box, Text } from '@termuijs/widgets';
import { useKeymap } from '@termuijs/jsx';
import { useRouter } from './useRouter';

export interface NotFoundProps {
  /** The path that was requested but had no registered route */
  path: string;
}

/**
 * DefaultNotFound
 *
 * Rendered automatically by <Router> when navigation targets an unregistered path.
 * Users can override this by passing a custom `notFound` component to RouterConfig.
 *
 * Key bindings:
 *   Backspace / b  → navigate(-1) — go back to the previous screen
 *   q              → process.exit(0) — quit the terminal app
 */
export function DefaultNotFound({ path }: NotFoundProps) {
  const { navigate } = useRouter();

  useKeymap({
    // Go back to the previous route
    'backspace': () => navigate(-1),
    'b':         () => navigate(-1),
    // Quit the app (standard terminal convention)
    'q':         () => process.exit(0),
    'ctrl+c':    () => process.exit(0),
  });

  return (
    <Box
      border="round"
      padding={1}
      flexDirection="column"
      gap={1}
    >
      {/* Title */}
      <Text bold color="red">
        Route Not Found
      </Text>

      {/* The unmatched path */}
      <Text>
        {'No screen is registered for: '}
        <Text bold color="yellow">{path}</Text>
      </Text>

      {/* Help text */}
      <Text dim>
        Press Backspace to go back · Press Q to quit
      </Text>
    </Box>
  );
}