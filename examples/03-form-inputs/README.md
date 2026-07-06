# 03 · Form Inputs

Type your name into a text field and see it echoed back — your first
interactive input example.

## What you'll learn
- Using the `TextInput` widget from `@termuijs/widgets`
- Forwarding keyboard events into a focused input with `handleKey`
- Reacting to submission via the `onSubmit` callback

## Run it
```bash
cd examples/03-form-inputs
bun install
bun run start
```

## Expected output
```
┌────────────────────────────────────────┐
│ What's your name?                       │
│ ┌──────────────────────────────────┐   │
│ │ sam_                              │   │
│ └──────────────────────────────────┘   │
│                                          │
│ Hello, sam! Nice to meet you.           │
│                                          │
│ Type your name, press Enter · Esc = quit│
└────────────────────────────────────────┘
```

Press `Esc` or `Ctrl+C` to exit.