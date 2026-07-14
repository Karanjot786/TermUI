# Convert Raw HTML Tables to Markdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raw `<table>` HTML blocks in the docs with markdown pipe tables.

**Architecture:** One conversion pass. A pure function turns a `<table>...</table>` string into a markdown pipe table. A script applies it to every `.mdx` under `content/docs`, skipping any table it cannot parse cleanly. The `.md` endpoints regenerate afterward so the LLM-citation surface gets clean tables too.

**Tech Stack:** Node script (the repo already runs `.mjs` scripts), Vitest for the pure function, the existing `generate-llm-docs.mjs` for the `.md` regen.

## Global Constraints

- 38 of 65 docs contain `<table>` blocks. Their structure is regular: `<table><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr>...</tbody></table>`. Cells hold plain text and backtick code spans (for example `` `Box` ``).
- Convert only what parses cleanly. If a table has merged cells, nested tags beyond inline code, or any structure the parser does not recognize, leave the HTML as is and log it. A wrong conversion is worse than an unconverted table.
- Escape pipes inside cells. A literal `|` in a cell breaks a markdown table, so replace it with `\|`.
- Preserve backtick code spans verbatim. Do not strip the backticks.
- Markdown tables need a blank line before and after to render. Ensure the replacement is surrounded by blank lines.
- Do not touch the component pages. Those use the `ApiTable` React component, not MDX `<table>`. Scope is `content/docs/**/*.mdx` only.
- After conversion, regenerate the `.md` endpoints (`node scripts/generate-llm-docs.mjs`) so they carry the markdown tables.
- Commit author `Karanjot786 <karanjots801@gmail.com>`. No `Co-Authored-By`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `website/scripts/lib/html-table.mjs` (create) | `htmlTableToMarkdown(tableHtml)` pure function. Returns a markdown table string, or `null` when the table does not parse cleanly. |
| `website/scripts/lib/html-table.test.mjs` (create) | Vitest tests for the converter. |
| `website/scripts/convert-tables.mjs` (create) | Walk `content/docs/**/*.mdx`, replace each `<table>` with its markdown form, report converted and skipped counts. |

---

## Task 1: The converter function

**Files:**
- Create: `website/scripts/lib/html-table.mjs`
- Test: `website/scripts/lib/html-table.test.mjs`

**Interfaces:**
- Produces: `htmlTableToMarkdown(tableHtml: string): string | null`.

- [ ] **Step 1: Write the failing test**

Create `website/scripts/lib/html-table.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { htmlTableToMarkdown } from './html-table.mjs';

describe('htmlTableToMarkdown', () => {
  it('converts a simple thead/tbody table', () => {
    const html = [
      '<table>',
      '<thead>',
      '<tr><th>Widget</th><th>Description</th></tr>',
      '</thead>',
      '<tbody>',
      '<tr><td>`Box`</td><td>Container with flex layout</td></tr>',
      '<tr><td>`Text`</td><td>Styled text</td></tr>',
      '</tbody>',
      '</table>',
    ].join('\n');
    const md = htmlTableToMarkdown(html);
    expect(md).toBe(
      [
        '| Widget | Description |',
        '| --- | --- |',
        '| `Box` | Container with flex layout |',
        '| `Text` | Styled text |',
      ].join('\n'),
    );
  });

  it('escapes a pipe inside a cell', () => {
    const html = '<table><thead><tr><th>Type</th></tr></thead><tbody><tr><td>`a | b`</td></tr></tbody></table>';
    expect(htmlTableToMarkdown(html)).toContain('`a \\| b`');
  });

  it('returns null for a table with a colspan it cannot represent', () => {
    const html = '<table><tbody><tr><td colspan="2">merged</td></tr></tbody></table>';
    expect(htmlTableToMarkdown(html)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `cd /Users/ksd/Desktop/CLI_UI && npx vitest run website/scripts/lib/html-table.test.mjs`
Expected: FAIL, cannot resolve `./html-table.mjs`.

- [ ] **Step 3: Implement `website/scripts/lib/html-table.mjs`**

```js
// Convert a single <table>...</table> HTML string to a markdown pipe table.
// Returns null when the table uses structure a pipe table cannot represent
// (colspan, rowspan, nested block tags), so the caller leaves it as HTML.

function cellText(rawCell) {
  // Strip the surrounding <td>/<th> tag, keep inner text and inline code.
  let inner = rawCell.replace(/^<(td|th)[^>]*>/i, '').replace(/<\/(td|th)>$/i, '')
  // Reject anything with a nested block tag (we only allow inline content).
  if (/<(table|div|ul|ol|p|pre)\b/i.test(inner)) return null
  // Drop simple inline tags but keep their text (e.g. <code>x</code> -> x).
  inner = inner.replace(/<\/?(code|strong|em|b|i|span)[^>]*>/gi, '')
  inner = inner.replace(/\s+/g, ' ').trim()
  // Escape pipes so they do not break the markdown table.
  return inner.replace(/\|/g, '\\|')
}

function parseRow(rowHtml) {
  if (/colspan|rowspan/i.test(rowHtml)) return null
  const cells = []
  const re = /<(td|th)\b[^>]*>[\s\S]*?<\/\1>/gi
  let m
  while ((m = re.exec(rowHtml)) !== null) {
    const text = cellText(m[0])
    if (text === null) return null
    cells.push(text)
  }
  return cells.length ? cells : null
}

export function htmlTableToMarkdown(tableHtml) {
  if (/colspan|rowspan/i.test(tableHtml)) return null

  const rowRe = /<tr\b[^>]*>[\s\S]*?<\/tr>/gi
  const rows = []
  let m
  while ((m = rowRe.exec(tableHtml)) !== null) {
    const cells = parseRow(m[0])
    if (!cells) return null
    rows.push(cells)
  }
  if (rows.length < 1) return null

  const cols = rows[0].length
  if (rows.some((r) => r.length !== cols)) return null

  const header = rows[0]
  const bodyRows = rows.slice(1)
  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...bodyRows.map((r) => `| ${r.join(' | ')} |`),
  ]
  return lines.join('\n')
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `cd /Users/ksd/Desktop/CLI_UI && npx vitest run website/scripts/lib/html-table.test.mjs`
Expected: PASS, all three cases.

- [ ] **Step 5: Commit**

```bash
cd /Users/ksd/Desktop/CLI_UI
git add -f website/scripts/lib/html-table.mjs website/scripts/lib/html-table.test.mjs
git commit -m "feat(docs): html-table to markdown converter with safe fallback"
```

---

## Task 2: The conversion pass

**Files:**
- Create: `website/scripts/convert-tables.mjs`

**Interfaces:**
- Consumes: `htmlTableToMarkdown` from Task 1.
- Produces: rewritten `.mdx` files and a console report.

- [ ] **Step 1: Implement `website/scripts/convert-tables.mjs`**

```js
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { htmlTableToMarkdown } from './lib/html-table.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = join(ROOT, 'content', 'docs')

function walk(dir, acc) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, acc)
    else if (name.endsWith('.mdx')) acc.push(full)
  }
  return acc
}

let converted = 0
let skipped = 0
const skippedFiles = []

for (const file of walk(DOCS, [])) {
  const src = readFileSync(file, 'utf-8')
  let changed = false
  const out = src.replace(/<table[\s\S]*?<\/table>/gi, (block) => {
    const md = htmlTableToMarkdown(block)
    if (md === null) { skipped++; if (!skippedFiles.includes(file)) skippedFiles.push(file); return block }
    converted++
    changed = true
    // Ensure blank lines around the markdown table so it renders.
    return `\n${md}\n`
  })
  if (changed) {
    // Collapse any triple-or-more blank lines the insertion may have created.
    writeFileSync(file, out.replace(/\n{3,}/g, '\n\n'), 'utf-8')
  }
}

console.log(`[convert-tables] converted ${converted} tables, skipped ${skipped}`)
if (skippedFiles.length) {
  console.log('[convert-tables] left as HTML (review manually):')
  for (const f of skippedFiles) console.log('  ' + f.replace(ROOT + '/', ''))
}
```

- [ ] **Step 2: Run the conversion**

Run:
```bash
cd /Users/ksd/Desktop/CLI_UI/website && node scripts/convert-tables.mjs
```
Expected: prints a converted count (most of the ~38 files) and any skipped files. Note the skipped list; those keep their HTML.

- [ ] **Step 3: Verify no `<table>` remains except intentional skips**

Run:
```bash
grep -rl "<table" content/docs/ | wc -l
```
Expected: 0, or only the files the script reported as skipped. If a file was not in the skip list but still has `<table>`, the regex missed a variant; inspect and rerun.

- [ ] **Step 4: Regenerate the `.md` endpoints**

Run:
```bash
node scripts/generate-llm-docs.mjs
```
Expected: regenerates the 65 `.md` files with markdown tables. Spot-check one: `grep -A3 "| Widget" public/docs/widgets/overview.md` should show a pipe table, not `<table>`.

- [ ] **Step 5: Render-check the affected pages**

```bash
(bun run dev >/tmp/next-tables.log 2>&1 &) ; sleep 16
for slug in widgets/overview core/app tss/overview jsx/focus store/overview; do
  echo "$slug: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/docs/$slug --max-time 20)"
done
# Confirm a converted page renders a real table row, not raw HTML text
curl -s http://localhost:3000/docs/widgets/overview --max-time 15 | grep -c "<td" 
pkill -f "next dev"
```
Expected: each page 200. The `<td` count is greater than 0, meaning MDX rendered the pipe table into a real HTML table (the markdown table compiles to `<td>` at render time, while the source is now clean markdown).

- [ ] **Step 6: Commit**

```bash
cd /Users/ksd/Desktop/CLI_UI
git add -f website/scripts/convert-tables.mjs
git add -f website/content/docs
git add -f website/public/docs
git commit -m "docs: convert raw HTML tables to markdown pipe tables"
```

---

## Self-Review

**1. Spec coverage:** Raw `<table>` blocks become markdown pipe tables (Task 2 pass, Task 1 converter). Unparseable tables stay as HTML and are logged (converter returns null, script preserves the block). The `.md` endpoints regenerate (Task 2 Step 4). Component-page `ApiTable` is untouched (scope is `content/docs` only).

**2. Placeholder scan:** No TBD. Full code in every step. The skip list is an explicit, reported outcome, not a silent gap.

**3. Type consistency:** `htmlTableToMarkdown` returns `string | null` and every caller checks for null. The script walks only `.mdx` files and writes back the same paths.

**Ponytail note:** One pure function plus one script. No HTML-parsing dependency; the tables here are regular enough for a scoped regex parser, and the null-fallback makes a bad parse safe. If a future table needs colspan or nested blocks, it stays as HTML and shows up in the skip log for a human to handle. The conversion is a one-time pass; the scripts can stay in the repo as a re-runnable tool or be removed after the commit.
