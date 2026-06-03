# Progress Component

Displays progress information in a terminal-friendly progress bar.

## Usage

```typescript
import { Progress } from './index';

// Create a progress bar
const progress = new Progress();

// Update progress value
progress.setValue(0.5);
```

## Features

* Terminal-friendly progress display
* Configurable progress values
* Supports incremental progress updates
* Works with Unicode-capable terminals

## API

### Constructor

```typescript
constructor(style?: Partial<Style>, options?: ProgressBarOptions)
```

### Methods

* `setValue(value: number): void` — Update the current progress value
* `getValue(): number` — Get the current progress value

## Example

```typescript
const progress = new Progress();

progress.setValue(0.25);
progress.setValue(0.5);
progress.setValue(0.75);
progress.setValue(1);
```
