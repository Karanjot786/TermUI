#!/usr/bin/env python3
"""
TermUI PR creator - creates fix branches and PRs for upstream issues.
Fork: tmdeveloper007/TermUI
Upstream: Karanjot786/TermUI
Token: GH_TOKEN env var
"""

import json
import os
import re
import subprocess
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

GH_TOKEN = os.environ.get("GH_TOKEN", "")
FORK_OWNER = "tmdeveloper007"
UPSTREAM_OWNER = "Karanjot786"
REPO = "TermUI"
WORKSPACE = "/workspace/termui"

def log(msg):
    print(f"[{datetime.now(timezone.utc):%H:%M:%S}] {msg}", flush=True)

def run(cmd, cwd=WORKSPACE, check=True, capture=True):
    r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=capture, text=True)
    if capture:
        if r.stdout.strip():
            log(f"  stdout: {r.stdout[:300]}")
        if r.stderr.strip():
            log(f"  stderr: {r.stderr[:200]}")
    if check and r.returncode != 0:
        raise RuntimeError(f"Command failed ({r.returncode}): {cmd}")
    return r

def gh_api(url, method="GET", data=None, fork=False):
    base = f"https://api.github.com/repos/{FORK_OWNER if fork else UPSTREAM_OWNER}/{REPO}"
    headers = {
        "Authorization": f"token {GH_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "termui-mavis-bot/1.0",
    }
    body = json.dumps(data).encode() if data else None
    if body:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(f"{base}{url}", method=method, data=body, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read()), resp.status
    except urllib.error.HTTPError as e:
        return {"error": e.read().decode(errors="replace")[:300]}, e.code

# ── Fix 1: #3385 services.ts ─────────────────────────────────────────────────
def fix_3385():
    log("Applying fix for #3385 (services.list fallback)")
    path = f"{WORKSPACE}/packages/data/src/services.ts"
    content = open(path).read()

    # Patch: change getSystemdServices to return (results, failedNames)
    # and patch list() to handle failed names
    old_func = '''function getSystemdServices(serviceNames: string[]): ServiceInfo[] {
    const results: ServiceInfo[] = [];
    for (const name of serviceNames) {
        try {
            const output = execFileSync('systemctl', ['show', name], {
                encoding: 'utf-8',
                timeout: 3000,
            });
            const parsed = parseSystemdShow(output, name);
            if (!parsed) continue;

            const active = parsed.activeState === 'active';
            const uptimeSeconds = active && parsed.activeEnterTimestamp > 0
                ? Math.floor((Date.now() - parsed.activeEnterTimestamp) / 1000)
                : 0;

            let cpu = 0;
            let mem = 0;
            if (parsed.pid > 0) {
                try {
                    const psOut = execFileSync('ps', ['-p', String(parsed.pid), '-o', '%cpu,%mem', '--no-headers'], {
                        encoding: 'utf-8',
                        timeout: 2000,
                    });
                    const parts = psOut.trim().split(/\\s+/);
                    cpu = parseFloat(parts[0] ?? '0') || 0;
                    mem = parseFloat(parts[1] ?? '0') || 0;
                } catch {
                    // ps failed — cpu/mem stay 0
                }
            }

            results.push({
                name: parsed.name,
                active,
                status: parsed.subState,
                uptime: formatUptime(uptimeSeconds),
                uptimeSeconds,
                restarts: parsed.nRestarts,
                cpu,
                mem,
                pid: parsed.pid,
                description: parsed.description,
            });
        } catch {
            // systemctl not available or service not found — try fallback
        }
    }
    return results;
}'''

    new_func = '''function getSystemdServices(serviceNames: string[]): [ServiceInfo[], string[]] {
    const results: ServiceInfo[] = [];
    const failedNames: string[] = [];
    for (const name of serviceNames) {
        try {
            const output = execFileSync('systemctl', ['show', name], {
                encoding: 'utf-8',
                timeout: 3000,
            });
            const parsed = parseSystemdShow(output, name);
            if (!parsed) {
                failedNames.push(name);
                continue;
            }

            const active = parsed.activeState === 'active';
            const uptimeSeconds = active && parsed.activeEnterTimestamp > 0
                ? Math.floor((Date.now() - parsed.activeEnterTimestamp) / 1000)
                : 0;

            let cpu = 0;
            let mem = 0;
            if (parsed.pid > 0) {
                try {
                    const psOut = execFileSync('ps', ['-p', String(parsed.pid), '-o', '%cpu,%mem', '--no-headers'], {
                        encoding: 'utf-8',
                        timeout: 2000,
                    });
                    const parts = psOut.trim().split(/\\s+/);
                    cpu = parseFloat(parts[0] ?? '0') || 0;
                    mem = parseFloat(parts[1] ?? '0') || 0;
                } catch {
                    // ps failed — cpu/mem stay 0
                }
            }

            results.push({
                name: parsed.name,
                active,
                status: parsed.subState,
                uptime: formatUptime(uptimeSeconds),
                uptimeSeconds,
                restarts: parsed.nRestarts,
                cpu,
                mem,
                pid: parsed.pid,
                description: parsed.description,
            });
        } catch {
            failedNames.push(name);
        }
    }
    return [results, failedNames];
}'''

    # Patch list() to use failedNames
    old_list = '''        // Try systemd on Linux
        if (os.platform() === 'linux') {
            try {
                execFileSync('systemctl', ['--version'], { encoding: 'utf-8', timeout: 1000 });
                const svcs = getSystemdServices(serviceNames);
                if (svcs.length > 0) return svcs;
            } catch {
                // systemctl not available — continue to PM2
            }
        }

        // Try PM2
        const pm2Svcs = getPm2Services(serviceNames);'''

    new_list = '''        // Try systemd on Linux
        if (os.platform() === 'linux') {
            try {
                execFileSync('systemctl', ['--version'], { encoding: 'utf-8', timeout: 1000 });
                const [svcs, failedNames] = getSystemdServices(serviceNames);
                if (svcs.length > 0) {
                    // Pass unresolved names to PM2 / process fallback
                    if (failedNames.length > 0) {
                        const pm2Svcs = getPm2Services(failedNames);
                        const pm2Names = new Set(pm2Svcs.map(s => s.name));
                        const stillMissing = failedNames.filter(n => !pm2Names.has(n));
                        return [...svcs, ...pm2Svcs, ...getProcessFallback(stillMissing)];
                    }
                    return svcs;
                }
                // systemctl available but no services resolved — pass all names to fallback
                if (failedNames.length > 0) {
                    const pm2Svcs = getPm2Services(failedNames);
                    const pm2Names = new Set(pm2Svcs.map(s => s.name));
                    const stillMissing = failedNames.filter(n => !pm2Names.has(n));
                    return [...pm2Svcs, ...getProcessFallback(stillMissing)];
                }
            } catch {
                // systemctl not available — continue to PM2
            }
        }

        // Try PM2
        const pm2Svcs = getPm2Services(serviceNames);'''

    if old_func in content:
        content = content.replace(old_func, new_func)
        content = content.replace(old_list, new_list)
        open(path, "w").write(content)
        log("  Fixed services.ts")
        return True
    else:
        log(f"  Pattern not found in services.ts — skipping")
        return False

# ── Fix 2: #3384 create-termui-app ───────────────────────────────────────────
def fix_3384():
    log("Applying fix for #3384 (create-termui-app overwrite)")
    path = f"{WORKSPACE}/packages/create-termui-app/src/index.ts"
    content = open(path).read()

    old_block = '''  if (existsSync(projectDir)) {
    console.log(`\\n  ⚠  Directory "${projectName}" already exists. Files may be overwritten.\\n`);
  }'''

    new_block = '''  if (existsSync(projectDir)) {
    try {
        const entries = fs.readdirSync(projectDir);
        const hasContent = entries.some(e => e !== '.git');
        if (hasContent) {
            console.log(`\\n  ✖  Directory "${projectName}" is not empty. Refusing to overwrite.\\n`);
            console.log(`  Remove the directory or choose a different name.\\n`);
            return;
        }
    } catch {
        // readdirSync failed — let the write calls fail naturally
    }
    console.log(`\\n  ⚠  Directory "${projectName}" already exists. Files may be overwritten.\\n`);
  }'''

    if old_block in content:
        content = content.replace(old_block, new_block)
        # Also add fs import
        if "import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';" in content:
            content = content.replace(
                "import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';",
                "import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';"
            )
        open(path, "w").write(content)
        log("  Fixed create-termui-app index.ts")
        return True
    else:
        log(f"  Pattern not found in create-termui-app — skipping")
        return False

# ── Fix 3: #3364 LineGauge ────────────────────────────────────────────────────
def fix_3364():
    log("Applying fix for #3364 (LineGauge getters/setters)")
    path = f"{WORKSPACE}/packages/widgets/src/data/LineGauge.ts"
    content = open(path).read()

    # Add after getValue()
    insertion = '''    getValue(): number {
        return this._value;
    }

    getShowLabel(): boolean {
        return this._showLabel;
    }

    setShowLabel(show: boolean): void {
        if (this._showLabel === show) return;
        this._showLabel = show;
        this.markDirty();
    }

    getFilledChar(): string {
        return this._filledChar;
    }

    setFilledChar(char: string): void {
        if (this._filledChar === char) return;
        this._filledChar = char;
        this.markDirty();
    }

    protected _renderSelf'''

    if "getValue(): number" in content and "getShowLabel" not in content:
        content = content.replace(
            "    getValue(): number {\n        return this._value;\n    }\n\n    protected _renderSelf",
            insertion
        )
        open(path, "w").write(content)
        log("  Fixed LineGauge.ts")
        return True
    else:
        log("  LineGauge already has these methods or pattern not found — skipping")
        return False

# ── Fix 4: #3363 Stat ─────────────────────────────────────────────────────────
def fix_3363():
    log("Applying fix for #3363 (Stat getters/setters)")
    path = f"{WORKSPACE}/packages/widgets/src/data/Stat.ts"
    content = open(path).read()

    insertion = '''    setDelta(delta: number | undefined): void {
        this._delta = delta !== undefined ? validateFinite(delta) : undefined;
        this.markDirty();
    }

    getValue(): string {
        return this._value;
    }

    getLabel(): string {
        return this._label;
    }

    setLabel(label: string): void {
        if (this._label === label) return;
        this._label = label;
        this.markDirty();
    }

    getDelta(): number | undefined {
        return this._delta;
    }

    protected _renderSelf'''

    if "getValue()" not in content and "setDelta" in content:
        content = content.replace(
            "    setDelta(delta: number | undefined): void {\n        this._delta = delta !== undefined ? validateFinite(delta) : undefined;\n        this.markDirty();\n    }\n\n    protected _renderSelf",
            insertion
        )
        open(path, "w").write(content)
        log("  Fixed Stat.ts")
        return True
    else:
        log("  Stat already has these methods or pattern not found — skipping")
        return False

# ── Fix 5: #3350 prompts.ts ───────────────────────────────────────────────────
def fix_3350():
    log("Applying fix for #3350 (node: prefix for readline)")
    path = f"{WORKSPACE}/packages/ui/src/prompts.ts"
    content = open(path).read()

    if "from 'readline'" in content:
        content = content.replace("from 'readline'", "from 'node:readline'")
        open(path, "w").write(content)
        log("  Fixed prompts.ts")
        return True
    else:
        log("  prompts.ts already uses node: prefix or pattern not found — skipping")
        return False

# ── Fix 6: #3351 Timeline ─────────────────────────────────────────────────────
def fix_3351():
    log("Applying fix for #3351 (Timeline ASCII fallback for connectors)")
    path = f"{WORKSPACE}/packages/widgets/src/display/Timeline.ts"
    content = open(path).read()

    old_connectors = '''            let connector: string;
            if (isLast) {
                connector = '\\u2514\\u2500'; // └─
            } else {
                connector = '\\u251C\\u2500'; // ├─
            }'''

    new_connectors = '''            let connector: string;
            if (caps.unicode) {
                connector = isLast ? '\\u2514\\u2500' : '\\u251C\\u2500'; // └─ / ├─
            } else {
                connector = isLast ? '`-' : '|-'; // ASCII fallback
            }'''

    if old_connectors in content:
        content = content.replace(old_connectors, new_connectors)
        open(path, "w").write(content)
        log("  Fixed Timeline.ts")
        return True
    else:
        log("  Timeline connector pattern not found — skipping")
        return False

# ── Fix 7: #3352 ThinkingBlock ───────────────────────────────────────────────
def fix_3352():
    log("Applying fix for #3352 (ThinkingBlock handleKey binding)")
    path = f"{WORKSPACE}/packages/widgets/src/display/ThinkingBlock.ts"
    content = open(path).read()

    # Find handleKey method
    if "handleKey(" not in content:
        # Add a public handleKey method
        insertion = '''    /**
     * Handle keyboard events for expansion toggle.
     */
    handleKey(event: KeyEvent): boolean {
        if (event.key === ' ' || event.key === 'Enter') {
            this.setExpanded(!this._expanded);
            return true;
        }
        return false;
    }

'''

        if "import {\n    type Screen," in content:
            content = content.replace(
                "import {\n    type Screen,",
                insertion + "import {\n    type Screen,"
            )
        open(path, "w").write(content)
        log("  Fixed ThinkingBlock.ts")
        return True
    else:
        log("  ThinkingBlock already has handleKey — skipping")
        return False

# ── Create branch + commit + push + PR ────────────────────────────────────────
def create_pr(fix_name, issue_num, branch_suffix):
    branch = f"termui-mavis-fix-{issue_num}-{branch_suffix}"
    log(f"Creating branch '{branch}'")

    try:
        run(f"git checkout main")
        run(f"git checkout -b {branch}")

        run(f"git add -A")
        diff = run("git diff --cached --stat", capture=True).stdout
        if not diff.strip():
            log(f"  No changes — skipping")
            run("git checkout main")
            run(f"git branch -D {branch}", check=False)
            return None

        run(f'git commit -m "fix(data): address #{issue_num} — {fix_name}"')

        # Push to fork
        run(f"git remote set-url origin https://{GH_TOKEN}@github.com/{FORK_OWNER}/{REPO}.git")
        run(f"git push -u origin {branch}")
        run(f"git remote set-url origin https://github.com/{FORK_OWNER}/{REPO}.git")

        # Switch back to main
        run("git checkout main")
        run(f"git branch -D {branch}", check=False)

        # Create fork PR
        pr_body = (
            f"## Summary\n"
            f"Fix for [{UPSTREAM_OWNER}/{REPO} #{issue_num}](https://github.com/{UPSTREAM_OWNER}/{REPO}/issues/{issue_num}).\n\n"
            f"**Issue:** {fix_name}\n\n"
            f"_This PR was auto-generated by Mavis TermUI Bot._"
        )
        data = {
            "title": f"fix(termui): address #{issue_num}",
            "body": pr_body,
            "head": f"{FORK_OWNER}:{branch}",
            "base": "main",
        }
        resp, status = gh_api("/pulls", method="POST", data=data, fork=True)
        if status in (200, 201, 422):
            pr_num = resp.get("number", "?")
            pr_url = resp.get("html_url", "?")
            log(f"  Fork PR #{pr_num}: {pr_url}")
            return {"issue": issue_num, "pr": pr_num, "url": pr_url}
        else:
            log(f"  PR creation failed {status}: {str(resp)[:200]}")
            return {"issue": issue_num, "pr": "FAILED", "url": resp.get("html_url", "?")}
    except Exception as e:
        log(f"  Failed: {e}")
        try:
            run("git checkout main", check=False)
            run(f"git branch -D {branch}", check=False)
        except:
            pass
        return None

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    log(f"TermUI PR creator start — {datetime.now(timezone.utc).isoformat()}")

    results = []

    fixes = [
        (fix_3385, "3385", "services-list-fallback"),
        (fix_3384, "3384", "create-app-no-overwrite"),
        (fix_3364, "3364", "linegauge-getters"),
        (fix_3363, "3363", "stat-getters"),
        (fix_3350, "3350", "node-readline-prefix"),
        (fix_3351, "3351", "timeline-ascii-fallback"),
        (fix_3352, "3352", "thinkingblock-handlekey"),
    ]

    for fix_fn, issue_num, suffix in fixes:
        try:
            applied = fix_fn()
            if applied:
                pr_result = create_pr(fix_fn.__name__.replace("fix_", ""), issue_num, suffix)
                if pr_result:
                    results.append(pr_result)
        except Exception as e:
            log(f"  Error in {fix_fn.__name__}: {e}")

    # Write summary
    print("\n=== PR Summary ===")
    for r in results:
        print(f"Issue #{r['issue']} → PR #{r['pr']}: {r['url']}")

    return results

if __name__ == "__main__":
    main()
