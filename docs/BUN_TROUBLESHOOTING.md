# Bun Installation Troubleshooting Guide

This guide helps resolve common issues encountered while installing Bun and setting up the TermUI development environment.

---

# Prerequisites

Before setting up the project, ensure you have:

- Bun **1.3.0** or newer
- Node.js **18+**
- Git installed
- A supported terminal (PowerShell, Windows Terminal, macOS Terminal, or a Linux shell)

Verify your installation:

```bash
bun --version
node --version
git --version
```

---

# Common Installation Issues

## Bun Command Not Found

### Problem

```text
'bun' is not recognized as an internal or external command.
```

### Solution

Verify that Bun is installed:

```bash
bun --version
```

If Bun is not installed, follow the official installation instructions:

https://bun.sh/docs/installation

Restart your terminal after installation.

If the problem persists, ensure Bun has been added to your system PATH.

---

## PowerShell Execution Policy Error (Windows)

### Problem

```text
running scripts is disabled on this system
```

### Solution

Open PowerShell as Administrator and run:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Restart PowerShell and try again.

---

## Permission Denied

### Problem

Installation or build commands fail with permission errors.

### Solution

Windows

- Run PowerShell or Windows Terminal as Administrator.

macOS / Linux

```bash
sudo bun install
```

Only use elevated permissions when necessary.

---

# Dependency Installation Fails

### Problem

```bash
bun install
```

fails or stops unexpectedly.

### Solution

Remove cached dependencies and reinstall.

```bash
bun run clean
bun install
```

If the issue persists, delete:

- node_modules
- bun.lock

Then run:

```bash
bun install
```

---

# Build Errors

### Problem

The project fails during compilation.

### Solution

Verify your Bun version:

```bash
bun --version
```

Ensure all dependencies are installed:

```bash
bun install
```

Then rebuild:

```bash
bun run build
```

---

# Typecheck Errors

Run:

```bash
bun run typecheck
```

If errors appear after switching branches, reinstall dependencies:

```bash
bun install
```

---

# Test Failures

Run the test suite:

```bash
bun test
```

or

```bash
bun run test
```

If tests fail unexpectedly:

```bash
bun run clean
bun install
bun run test
```

---

# Cache Issues

Unexpected runtime behavior may be caused by stale caches.

Refresh the project:

```bash
bun run clean
bun install
bun run build
```

---

# Keeping Bun Updated

Check your installed version:

```bash
bun --version
```

Refer to the official Bun documentation for upgrade instructions:

https://bun.sh/docs/installation

---

# Verifying Your Setup

A successful setup should complete the following commands without errors:

```bash
bun install
bun run build
bun run test
bun run typecheck
```

---

# Getting Additional Help

If you continue experiencing setup issues:

- Review the project's `CONTRIBUTING.md`
- Check the project's Issues page for similar reports
- Consult the official Bun documentation:
  https://bun.sh/docs

---

# Quick Setup Checklist

- ✅ Bun 1.3.0 or newer installed
- ✅ Node.js 18 or newer installed
- ✅ Git installed
- ✅ Dependencies installed with `bun install`
- ✅ Project builds successfully
- ✅ Tests pass
- ✅ Typecheck passes