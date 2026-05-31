@echo off
REM Start the TermUI showcase from this script's folder.
pushd "%~dp0"
npx tsx src/index.ts
