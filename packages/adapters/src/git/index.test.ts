import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { useGit } from './index.js'

let hasSimpleGit = false
try {
  const require = createRequire(import.meta.url)
  require('simple-git')
  hasSimpleGit = true
} catch {}

const describeOrSkip = hasSimpleGit ? describe : describe.skip

describeOrSkip('useGit adapter', () => {
  let tempDir: string
  let remoteDir: string
  let tempDir2: string
  let defaultBranch = 'main'

  beforeAll(() => {
    // Create unique temp directories
    tempDir = mkdtempSync(join(tmpdir(), 'termui-git-test-local-'))
    remoteDir = mkdtempSync(join(tmpdir(), 'termui-git-test-remote-'))
    tempDir2 = mkdtempSync(join(tmpdir(), 'termui-git-test-clone-'))

    // Initialize remote bare repo
    execSync('git init --bare', { cwd: remoteDir })

    // Initialize local repo
    execSync('git init', { cwd: tempDir })
    execSync('git config user.name "TermUI Test"', { cwd: tempDir })
    execSync('git config user.email "test@termui.io"', { cwd: tempDir })
    execSync('git config commit.gpgSign false', { cwd: tempDir })
    execSync(`git remote add origin "${remoteDir}"`, { cwd: tempDir })

    // Determine default branch name
    try {
      const branchOutput = execSync('git branch --show-current', { cwd: tempDir }).toString().trim()
      if (branchOutput) {
        defaultBranch = branchOutput
      }
    } catch {
      // Fallback to defaultBranch if command fails or is empty
    }
  })

  afterAll(() => {
    // Cleanup directories
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch {}
    try {
      rmSync(remoteDir, { recursive: true, force: true })
    } catch {}
    try {
      rmSync(tempDir2, { recursive: true, force: true })
    } catch {}
  })

  it('behaves correctly in a lifecycle flow', async () => {
    const git = useGit(tempDir)

    // 1. Initial status should be clean
    let status = await git.status()
    expect(status.untracked).toEqual([])
    expect(status.modified).toEqual([])
    expect(status.staged).toEqual([])

    // 2. Create a file and verify it is untracked
    const filename = 'sample.txt'
    writeFileSync(join(tempDir, filename), 'initial content')
    status = await git.status()
    expect(status.untracked).toContain(filename)
    expect(status.staged).not.toContain(filename)

    // 3. Stage the file
    await git.stage([filename])
    status = await git.status()
    expect(status.staged).toContain(filename)
    expect(status.untracked).not.toContain(filename)

    // 4. Commit the changes
    const commitResult = await git.commit('feat: add sample file')
    expect(commitResult.commit).toBeDefined()
    status = await git.status()
    expect(status.staged).not.toContain(filename)
    expect(status.untracked).not.toContain(filename)

    // 5. Verify the commit log
    const logResult = await git.log()
    expect(logResult.total).toBe(1)
    expect(logResult.latest?.message).toBe('feat: add sample file')
    expect(logResult.latest?.author_name).toBe('TermUI Test')

    // 6. Verify diff when modifying the file
    writeFileSync(join(tempDir, filename), 'modified content')
    status = await git.status()
    expect(status.modified).toContain(filename)

    const diffOutput = await git.diff()
    expect(diffOutput).toContain('modified content')

    // Stage and commit modification
    await git.stage(filename)
    await git.commit('fix: modify sample file')

    // 7. Push changes to the bare remote repo
    const pushResult = await git.push('origin', defaultBranch)
    expect(pushResult.pushed).toBeDefined()

    // 8. Clone remote and test pulling
    execSync(`git clone "${remoteDir}" "${tempDir2}"`)
    // Configure clone repo git
    execSync('git config user.name "TermUI Test 2"', { cwd: tempDir2 })
    execSync('git config user.email "test2@termui.io"', { cwd: tempDir2 })
    execSync('git config commit.gpgSign false', { cwd: tempDir2 })

    const gitClone = useGit(tempDir2)
    const cloneStatus = await gitClone.status()
    expect(cloneStatus.untracked).toEqual([])
    expect(cloneStatus.modified).toEqual([])

    // Make another commit in the original repo and push it
    writeFileSync(join(tempDir, filename), 'even more content')
    await git.stage(filename)
    await git.commit('docs: update content')
    await git.push('origin', defaultBranch)

    // Pull changes into the cloned repo
    const pullResult = await gitClone.pull()
    expect(pullResult.summary).toBeDefined()
    expect(existsSync(join(tempDir2, filename))).toBe(true)
  })
})
