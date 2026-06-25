# @termuijs/core

The core rendering engine and layout system of TermUI.

## `render`

Mounts the root node of your application and starts the rendering loop.

```tsx
import { render } from '@termuijs/core';
render(<App />);
```

## `unmount`

Gracefully shuts down the terminal application and restores the terminal buffer.

```tsx
import { unmount } from '@termuijs/core';
unmount();
```
