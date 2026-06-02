# Auth Flow Example

## Overview
Demonstrates an authentication flow using global state and conditional rendering.

## Authentication flow explanation
The user starts on the login screen. Submitting a username and password triggers the `login` action in the auth store. The main application component reads the `isAuthenticated` state to conditionally render the protected screen instead of the login screen.

## Store usage explanation
Global state is managed via `@termuijs/store`. The `authStore` stores `isAuthenticated` and `username`. React components can subscribe to these values and will automatically re-render when the state changes.

## How to run
```bash
cd examples/auth-flow
bun install
bun run dev
```
