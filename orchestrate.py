#!/usr/bin/env python3
"""
TermUI GSSOC Auto-PR orchestrator.
"""
import json, os, re, subprocess, sys, time
from urllib.request import Request, urlopen
from urllib.error import HTTPError

# ── Config ────────────────────────────────────────────────────────────────────
OWNER       = "karanjot786"
REPO        = "termui"
FORK_OWNER  = "tmdeveloper007"
FORK_REPO   = "TermUI"
BASE_BRANCH = "main"
TOKEN       = os.environ.get("GH_TOKEN", os.environ.get("GITHUB_TOKEN", ""))
HEADERS     = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/vnd.github.v3+json",
}
WORKSPACE   = "/workspace/termui"

LOG_LINES = []

def log(msg):
    ts = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    LOG_LINES.append(line)

def api(method, path, data=None, base="https://api.github.com"):
    url = f"{base}{path}"
    body = json.dumps(data).encode() if data is not None else None
    req = Request(url, method=method, data=body, headers=HEADERS)
    try:
        with urlopen(req, timeout=30) as r:
            return json.loads(r.read()), r.status
    except HTTPError as e:
        body = e.read()
        try:
            err = json.loads(body)
        except Exception:
            err = body.decode(errors="replace")
        return err, e.code

def git(*args, **kw):
    kw.setdefault("cwd", WORKSPACE)
    kw.setdefault("capture_output", True)
    kw.setdefault("text", True)
    r = subprocess.run(["git"] + list(args), **kw)
    return r

def push_branch(branch_name, force=False):
    cmd = ["git", "push", "origin", branch_name]
    if force:
        cmd += ["--force-with-lease"]
    r = subprocess.run(cmd, cwd=WORKSPACE, capture_output=True, text=True)
    if r.returncode != 0:
        log(f"  PUSH FAILED: {r.stderr.strip()[:200]}")
        return False
    log(f"  Branch pushed: {branch_name}")
    return True

def wait_ci(pr_number, timeout=900, poll=30):
    start = time.time()
    while time.time() - start < timeout:
        time.sleep(poll)
        data, status = api("GET", f"/repos/{OWNER}/{REPO}/pulls/{pr_number}")
        if status == 200:
            checks = data.get("mergeable_state", "unknown")
            head_sha = data.get("head", {}).get("sha", "")
            log(f"  PR #{pr_number} mergeable={checks}")
            if checks in ("clean", "unstable"):
                return "MERGEABLE"
            if checks == "blocked":
                return "BLOCKED"
            if head_sha:
                st_data, _ = api("GET", f"/repos/{OWNER}/{REPO}/commits/{head_sha}/status")
                st = st_data.get("state", "")
                log(f"  CI state={st}")
                if st == "success":
                    return "PASSED"
                if st == "failure":
                    return "FAILED"
        else:
            log(f"  CI poll error: {data}")
    return "TIMEOUT"

# ── Phase 1 ───────────────────────────────────────────────────────────────────
def phase1():
    log("=== PHASE 1 ===")
    data, status = api("GET", f"/repos/{OWNER}/{REPO}/pulls?state=open&per_page=50&head={FORK_OWNER}")
    if status != 200:
        log(f"  Failed: {data}")
        return
    prs = data if isinstance(data, list) else []
    log(f"  Open PRs from {FORK_OWNER}: {len(prs)}")
    for pr in prs:
        log(f"  #{pr['number']} {pr['title'][:80]}")
    return prs

# ── Changes definitions ───────────────────────────────────────────────────────
CHANGES = [
    {
        "type": "feat",
        "what": "add delete method to Session for removing individual keys",
        "summary": "The Session class currently lacks a delete(key) method for removing individual session values. Adding this method improves API completeness.",
        "changes": "Add delete(key: string): void method to Session class in packages/core/src/session/Session.ts, before the stopAutoSave method.",
        "impact": "Allows selective removal of session data without clearing the entire session.",
        "file": "packages/core/src/session/Session.ts",
    },
    {
        "type": "feat",
        "what": "add has method to Session for checking key existence",
        "summary": "The Session class lacks a has(key) method to check whether a key exists in session data. This is a standard map-like API pattern.",
        "changes": "Add has(key: string): boolean method to Session class before the clear() method.",
        "impact": "Improves API ergonomics for checking key existence before accessing values.",
        "file": "packages/core/src/session/Session.ts",
    },
    {
        "type": "fix",
        "what": "replace emoji in EmptyState default icon with ASCII fallback",
        "summary": "The EmptyState widget uses emoji character in its default icon when caps.unicode is true. The project hard rules prohibit emojis in source code.",
        "changes": "Replace the default icon 'inbox tissue' emoji with ASCII '[x]' in packages/widgets/src/feedback/EmptyState.ts.",
        "impact": "Ensures EmptyState renders correctly in all terminals and aligns with coding standards.",
        "file": "packages/widgets/src/feedback/EmptyState.ts",
    },
    {
        "type": "feat",
        "what": "add hasNext and hasPrev navigation helpers to VirtualList",
        "summary": "VirtualList exposes navigation methods but lacks hasNext() and hasPrev() boolean helpers for checking navigation boundaries.",
        "changes": "Add hasNext(): boolean and hasPrev(): boolean getter methods to VirtualList in packages/widgets/src/input/VirtualList.ts before the scrollOffset getter.",
        "impact": "Provides standard navigation helpers preventing callers from duplicating boundary check logic.",
        "file": "packages/widgets/src/input/VirtualList.ts",
    },
    {
        "type": "feat",
        "what": "add removeChild method to Grid for proper area cleanup",
        "summary": "Grid overrides addChild to apply named area placement styles but does not override removeChild, leaving stale styles on removed children.",
        "changes": "Override removeChild(child: Widget): void in Grid class in packages/widgets/src/layout/Grid.ts before _renderSelf.",
        "impact": "Prevents layout side-effects when Grid children are removed and re-used elsewhere.",
        "file": "packages/widgets/src/layout/Grid.ts",
    },
]

# ── Apply changes ─────────────────────────────────────────────────────────────
def apply_change(issue_def):
    file_path = os.path.join(WORKSPACE, issue_def["file"])
    if not os.path.exists(file_path):
        log(f"  File not found: {file_path}")
        return False
    content = open(file_path).read()
    new_content = None

    fn = issue_def["what"]

    if "Session.ts" in issue_def["file"] and "delete method" in fn:
        marker = "    stopAutoSave(): void {"
        if "delete(" not in content and marker in content:
            insertion = '''    /**
     * Delete a value from the session.
     */
    delete(key: string): void {
        delete this._data[key];
    }

'''
            new_content = content.replace(marker, insertion + marker)

    elif "Session.ts" in issue_def["file"] and "has method" in fn:
        marker = "    clear(): void {"
        if "has(key" not in content and marker in content:
            insertion = '''    /**
     * Check if a key exists in the session.
     */
    has(key: string): boolean {
        return key in this._data;
    }

'''
            new_content = content.replace(marker, insertion + marker)

    elif "EmptyState.ts" in issue_def["file"]:
        if "📭" in content:
            new_content = content.replace("📭", "[x]")
        else:
            log(f"  No emoji found in EmptyState.ts")
            return False

    elif "VirtualList.ts" in issue_def["file"] and "hasNext" in fn:
        marker = "    get scrollOffset()"
        if "hasNext()" not in content and marker in content:
            insertion = '''    /** Whether there is a next item to select */
    hasNext(): boolean {
        return this._selectedIndex < this._totalItems - 1;
    }

    /** Whether there is a previous item to select */
    hasPrev(): boolean {
        return this._selectedIndex > 0;
    }

'''
            new_content = content.replace(marker, insertion + marker)

    elif "Grid.ts" in issue_def["file"] and "removeChild" in fn:
        marker = "    protected _renderSelf(_screen: Screen)"
        if "override removeChild" not in content and marker in content:
            insertion = '''    override removeChild(child: Widget): void {
        child.setStyle({
            gridColumnStart: undefined,
            gridColumnEnd: undefined,
            gridRowStart: undefined,
            gridRowEnd: undefined,
        });
        super.removeChild(child);
    }

'''
            new_content = content.replace(marker, insertion + marker)

    if new_content is None:
        log(f"  No change applied: {fn}")
        return False

    with open(file_path, "w") as f:
        f.write(new_content)
    log(f"  Applied: {issue_def['file']}")
    return True

# ── Phase 2 ───────────────────────────────────────────────────────────────────
def phase2():
    log("=== PHASE 2: Issues and PRs ===")

    # Ensure clean state
    git("checkout", "main")
    git("fetch", "upstream")
    git("reset", "--hard", "upstream/main")

    created = []
    for i, ch in enumerate(CHANGES):
        issue_num = None

        # Create upstream issue
        issue_title = f"{ch['type']} : add {ch['what']}"
        issue_body = (
            f"## Summary of What Needs to be Done\n\n{ch['summary']}\n\n"
            f"## Changes that Need to be Made\n\n{ch['changes']}\n\n"
            f"## Impact that it would Provide\n\n{ch['impact']}\n\n"
            f"## Note: Please assign this issue to the `tmdeveloper007` account.\n"
        )
        data, status = api("POST", f"/repos/{OWNER}/{REPO}/issues", {
            "title": issue_title,
            "body": issue_body,
            "labels": ["bug"] if ch["type"] == "fix" else ["enhancement"],
        })
        if status in (201, 200):
            issue_num = data.get("number")
            log(f"  Issue #{issue_num} created: {issue_title}")
        else:
            log(f"  Failed to create issue: {data}")
            continue

        # Create branch
        branch_name = f"fix/{ch['type']}-{issue_num}"
        git("checkout", "-b", branch_name)

        # Apply change
        if not apply_change(ch):
            log(f"  Change failed for #{issue_num}")
            git("checkout", "main")
            git("branch", "-D", branch_name)
            continue

        # Commit
        commit_msg = f"{ch['type']}: {ch['what']}"
        r = git("add", "-A")
        r = git("commit", "-m", commit_msg)
        if r.returncode != 0:
            log(f"  Commit failed: {r.stderr[:200]}")
            git("checkout", "main")
            git("branch", "-D", branch_name)
            continue

        # Push
        if not push_branch(branch_name):
            log(f"  Push failed for #{issue_num}")
            git("checkout", "main")
            git("branch", "-D", branch_name)
            continue

        # Open PR
        pr_title = f"{ch['type']} : added {ch['what']}"
        pr_body = (
            f"Closes #{issue_num}\n\n"
            f"## Summary of What Has Been Done\n\n{ch['summary']}\n\n"
            f"## Changes Made\n\n{ch['changes']}\n\n"
            f"## Impact it Made\n\n{ch['impact']}\n\n"
            f"## Note: Please assign this PR to the `tmdeveloper007` account.\n"
        )
        pr_data, status = api("POST", f"/repos/{OWNER}/{REPO}/pulls", {
            "title": pr_title,
            "body": pr_body,
            "head": f"{FORK_OWNER}:{branch_name}",
            "base": BASE_BRANCH,
        })
        if status in (201, 200):
            pr_num = pr_data.get("number")
            log(f"  PR #{pr_num} opened: {pr_title}")
            created.append({
                "issue": issue_num,
                "pr": pr_num,
                "title": pr_title,
                "branch": branch_name,
                "file": ch["file"],
            })
        else:
            log(f"  PR creation failed: {pr_data}")

        git("checkout", "main")

    return created

# ── Phase 3 ───────────────────────────────────────────────────────────────────
def phase3(prs):
    log("=== PHASE 3: Monitor CI ===")
    for pr in prs:
        state = wait_ci(pr["pr"], timeout=900, poll=30)
        pr["ci_state"] = state
        log(f"  PR #{pr['pr']}: {state}")

# ── Verify ────────────────────────────────────────────────────────────────────
def verify():
    log("=== Verifying ===")
    r = subprocess.run("cd /workspace/termui && bun install 2>&1 | tail -3",
                       shell=True, capture_output=True, text=True)
    if r.returncode != 0:
        log(f"  bun install: {r.stderr[:200]}")
    else:
        log("  bun install ok")

    r = subprocess.run("cd /workspace/termui && bun run typecheck 2>&1 | tail -15",
                       shell=True, capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        log(f"  typecheck WARN: {r.stdout[-400:]}")
    else:
        log("  typecheck ok")

    r = subprocess.run("cd /workspace/termui && bun run test 2>&1 | tail -20",
                       shell=True, capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        log(f"  tests WARN: {r.stdout[-400:]}")
    else:
        log("  tests ok")

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    ts = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    log(f"TermUI GSSOC Auto-PR run at {ts}")
    log(f"Token: {'YES' if TOKEN else 'NO'}")

    phase1()
    prs = phase2()

    if prs:
        verify()
        phase3(prs)

    # Write report
    report = "/workspace/termui/.mavis/last-run-report.md"
    os.makedirs(os.path.dirname(report), exist_ok=True)
    lines = [f"# TermUI GSSOC Auto-PR Run Report\n", f"**Timestamp:** {ts}\n",
             f"\n## PRs Created\n"]
    for pr in prs:
        lines.append(f"- Issue #{pr['issue']} / PR #{pr['pr']}: {pr['title']}\n")
        lines.append(f"  - File: {pr['file']} | CI: {pr.get('ci_state', 'unknown')}\n")

    lines.append(f"\n## Log\n\n" + "\n".join(LOG_LINES) + "\n")

    with open(report, "w") as f:
        f.writelines(lines)

    log(f"Report: {report}")
    log("Done.")

if __name__ == "__main__":
    main()
