#!/usr/bin/env pwsh
Set-Location "C:\Users\sande\GSSOC\Term-UI"
Write-Host "Current location: $(Get-Location)"
Write-Host "Git repository exists: $(Test-Path .git)"

Write-Host "`nCreating branch feat/screenmode-viewport..."
git checkout -b feat/screenmode-viewport

Write-Host "`nAdding files..."
git add -A

Write-Host "`nCommitting changes..."
git commit -m "feat: add screenMode prop with alternate/main/inline rendering modes

- Add screenMode option: 'alternate' (default), 'main', 'inline'
- Add inlineRows prop to configure inline viewport row count
- Smart default: screenMode='main' if fullscreen=false, else 'alternate'
- Conditional alt-screen entry only when screenMode='alternate'
- Implement insertBefore() API for persistent header lines
- Add renderInlineToTerminal() to render bottom N rows preserving scrollback
- Export inline viewport helpers from public API
- Add comprehensive test coverage for all screenMode variants"

Write-Host "`nBranch status:"
git branch -v

Write-Host "`nCurrent branch:"
git branch --show-current

Write-Host "`nRecent commit:"
git log --oneline -1

Write-Host "`nBranch created successfully! Ready for pull request."
