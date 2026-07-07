### `notFound` — Custom 404 fallback

**Type:** `React.ComponentType<{ path: string }>` | optional

When navigation targets a path with no registered route, the router renders
the `notFound` component instead of a blank screen. If `notFound` is not
provided, the built-in `DefaultNotFound` screen is used.

**Default behavior** (no `notFound` prop):

```tsx
// Navigating to an unregistered path renders:
// ╭─────────────────────────────╮
// │ Route Not Found             │
// │                             │
// │ No screen is registered for: /settings/unknown
// │                             │
// │ Press Backspace to go back · Press Q to quit
// ╰─────────────────────────────╯
```

**Custom fallback:**

```tsx
<Router
  config={{
    routes: [
      { path: '/', component: Home },
      { path: '/about', component: About },
    ],
    notFound: ({ path }) => (
      <Box border="round">
        <Text color="red">No screen at {path}</Text>
        <Text dim>Press Q to quit</Text>
      </Box>
    ),
  }}
/>
```

**Importing `DefaultNotFound` directly** (if you want to compose it):

```tsx
import { DefaultNotFound } from '@termuijs/router';
```