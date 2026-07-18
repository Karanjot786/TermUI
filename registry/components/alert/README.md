# Alert Component

An inline alert message for status, warning, error, and success feedback.

## Usage

```typescript
import { Alert } from './components/alert';

const alert = new Alert({
  type: 'warning',
  message: 'Check your configuration before continuing.',
});

const success = new Alert({
  type: 'success',
  title: 'Saved',
  message: 'Changes were written successfully.',
});
```

## Features

- Status-focused alert variants
- Optional title and message content
- Suitable for warnings, errors, success notices, and informational feedback

## API

### Constructor

```typescript
constructor(opts: AlertOptions, style?: Partial<Style>)
```

## Example

```typescript
const container = new Box({ flexDirection: 'column' });
const alert = new Alert({
  type: 'error',
  title: 'Connection failed',
  message: 'Retry after checking the service URL.',
});
container.addChild(alert);
```
