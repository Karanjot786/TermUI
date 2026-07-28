# TermUI Troubleshooting Guide

Reference index for diagnosing and fixing common local environment build issues.

## 1. Node Module Version Mismatch
* **Symptom**: Application fails to bundle with explicit missing dependency hooks.
* **Resolution**: Wipe your active module tree and reinstall packages from scratch:
  ```bash
  rm -rf node_modules package-lock.json && npm install
  ```

## 2. Terminal Resizing Screen Glitches
* **Symptom**: Interface layout blocks break when running inside small viewport sizes.
* **Resolution**: Keep your host terminal window scale above a minimum threshold of 80x24 characters.

## 3. Missing Execution Permissions
* **Symptom**: Local shell scripts fail to run with an access denial alert.
* **Resolution**: Explicitly grant execution rights via your local command shell:
  ```bash
  chmod +x ./scripts/*
  ```
