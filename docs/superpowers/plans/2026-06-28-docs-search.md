# Docs Full-Text Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the docs search box so `Cmd+K` opens a working search over all 65 docs.

**Architecture:** Build a static search index at build time from the docs the LLM-docs generator already parses. Search runs client-side over that index. No server route, no new search service. The existing `SearchTrigger` button gets a dialog and a `Cmd+K` hotkey.

**Tech Stack:** Next.js 16 App Router, the existing `scripts/generate-llm-docs.mjs` (already reads every doc plus frontmatter), a client React dialog, plain TypeScript scoring (no search library).

## Global Constraints

- The docs resolve through a hand-maintained `DOCS` map in `website/src/lib/source.ts` (65 entries), not the Fumadocs source. The index builder uses the same `content/docs/**/*.mdx` files the LLM-docs generator reads, so the two stay in sync.
- No new dependency. 65 docs is small. A scored substring match over title, description, headings, and body is enough. The roadmap named Orama; that is overkill at this size. Ponytail: ship the dependency-free version. Add Orama only if the corpus grows past a few hundred pages or needs typo tolerance. Mark that upgrade path in a comment.
- The index is a static `public/search-index.json`, generated in prebuild alongside llms.txt. It must stay small. Store title, description, section, slug, headings, and a trimmed body (first ~1500 chars, ANSI/markdown stripped), not the full MDX.
- Search is client-side and works on a static export. No `/api/search` route.
- The `SearchTrigger` component already exists at `website/src/components/navbar/SearchTrigger.tsx` with an `onOpen` prop and a `⌘K` hint. Reuse it. Do not rebuild the button.
- Commit author `Karanjot786 <karanjots801@gmail.com>`. No `Co-Authored-By`.
- Any user-visible copy: short, no em dashes.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `website/scripts/generate-llm-docs.mjs` (modify) | After writing llms.txt, also emit `public/search-index.json` from the same parsed docs. |
| `website/src/lib/search.ts` (create) | `searchDocs(index, query)` pure scoring function + the `SearchDoc` type. |
| `website/src/lib/search.test.ts` (create) | Unit tests for scoring and ranking. |
| `website/src/components/docs/SearchDialog.tsx` (create) | Client dialog: loads the index, runs `searchDocs`, renders results, keyboard nav. |
| `website/src/components/docs/SearchProvider.tsx` (create) | Client provider: holds open state, binds `Cmd+K`, renders `SearchDialog`, exposes `useSearch()`. |
| Nav/layout wiring (modify) | Wrap the app (or the nav) in `SearchProvider` and pass `onOpen` to the existing `SearchTrigger`. |
| `website/src/styles/search.css` (create) | Dialog styles, brand tokens. |

---

## Task 1: Build the static search index

**Files:**
- Modify: `website/scripts/generate-llm-docs.mjs`

**Interfaces:**
- Produces `website/public/search-index.json`: an array of `{ slug: string; title: string; description: string; section: string; headings: string[]; body: string }`.

- [ ] **Step 1: Read the generator's existing parse loop**

`scripts/generate-llm-docs.mjs` already iterates `SECTIONS`, reads each `content/docs/<section>/<slug>.mdx`, and parses frontmatter with `matter`. Find the loop that builds the `pages` array (it has `section`, `slug`, `title`, `frontmatter`, `content`).

- [ ] **Step 2: Add a heading + body extractor near the top of the script**

```js
// Strip MDX to plain text and pull H2/H3 headings for the search index.
function extractHeadings(md) {
  const out = []
  for (const line of md.split('\n')) {
    const m = /^#{2,3}\s+(.+)$/.exec(line.trim())
    if (m) out.push(m[1].replace(/[`*_]/g, '').trim())
  }
  return out
}
function toPlainText(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')        // drop code fences
    .replace(/<[^>]+>/g, ' ')                // drop HTML tags
    .replace(/[#>*_`|-]/g, ' ')              // drop markdown punctuation
    .replace(/\s+/g, ' ')
    .trim()
}
```

- [ ] **Step 3: Emit the index after llms.txt is written**

In `main` (or at the end of the script, after the llms.txt write), add:

```js
const searchIndex = pages.map((p) => ({
  slug: `${p.section}/${p.slug}`,
  title: p.title || p.slug,
  description: (p.frontmatter && p.frontmatter.description) || '',
  section: p.section,
  headings: extractHeadings(p.content),
  body: toPlainText(p.content).slice(0, 1500),
}))
writeFileSync(join(PUBLIC_DIR, 'search-index.json'), JSON.stringify(searchIndex))
console.log(`[generate-llm-docs] Generated search-index.json with ${searchIndex.length} entries`)
```

Use the same `pages` variable name the script already uses. If it differs, adapt.

- [ ] **Step 4: Run and verify the index**

Run:
```bash
cd website && node scripts/generate-llm-docs.mjs
node -e "const x=require('./public/search-index.json'); console.log('entries:', x.length); const a=x.find(e=>e.slug==='core/app'); console.log(a.title, '|', a.headings.length, 'headings |', a.body.length, 'chars')"
```
Expected: ~65 entries; `core/app` has a title, some headings, and a non-empty body. The file should be well under 1 MB.

- [ ] **Step 5: Commit**

```bash
cd /Users/ksd/Desktop/CLI_UI
git add -f website/scripts/generate-llm-docs.mjs website/public/search-index.json
git commit -m "feat(search): generate static search-index.json from docs in prebuild"
```

---

## Task 2: Scoring function

**Files:**
- Create: `website/src/lib/search.ts`
- Test: `website/src/lib/search.test.ts`

**Interfaces:**
- Produces:
  - `interface SearchDoc { slug: string; title: string; description: string; section: string; headings: string[]; body: string }`
  - `interface SearchHit { doc: SearchDoc; score: number; snippet: string }`
  - `searchDocs(index: SearchDoc[], query: string, limit?: number): SearchHit[]`

- [ ] **Step 1: Write the failing test**

Create `website/src/lib/search.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { searchDocs, type SearchDoc } from './search.js';

const INDEX: SearchDoc[] = [
  { slug: 'core/app', title: 'App Lifecycle', description: 'The App class bootstraps a terminal app', section: 'core', headings: ['Mounting', 'Exit'], body: 'app mount stdin raw mode render loop focus' },
  { slug: 'jsx/use-input', title: 'useInput', description: 'Handle keyboard input in components', section: 'jsx', headings: ['Key events'], body: 'useInput keypress KeyEvent modifiers' },
  { slug: 'widgets/spinner', title: 'Spinner', description: 'Animated loading indicator', section: 'widgets', headings: [], body: 'spinner preset frames color loading' },
];

describe('searchDocs', () => {
  it('ranks a title match above a body-only match', () => {
    const hits = searchDocs(INDEX, 'spinner');
    expect(hits[0]!.doc.slug).toBe('widgets/spinner');
  });
  it('matches description and headings', () => {
    expect(searchDocs(INDEX, 'keyboard').map((h) => h.doc.slug)).toContain('jsx/use-input');
    expect(searchDocs(INDEX, 'exit').map((h) => h.doc.slug)).toContain('core/app');
  });
  it('returns nothing for an empty query', () => {
    expect(searchDocs(INDEX, '   ')).toEqual([]);
  });
  it('respects the limit', () => {
    expect(searchDocs(INDEX, 'a', 2).length).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `cd /Users/ksd/Desktop/CLI_UI && npx vitest run website/src/lib/search.test.ts`
Expected: FAIL, cannot resolve `./search.js`.

- [ ] **Step 3: Implement `website/src/lib/search.ts`**

```ts
export interface SearchDoc {
  slug: string
  title: string
  description: string
  section: string
  headings: string[]
  body: string
}
export interface SearchHit { doc: SearchDoc; score: number; snippet: string }

// Dependency-free scored substring search. Fine for ~65 docs. If the corpus
// grows past a few hundred pages or needs typo tolerance, swap in Orama here
// without touching the callers.
export function searchDocs(index: SearchDoc[], query: string, limit = 8): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const terms = q.split(/\s+/)

  const hits: SearchHit[] = []
  for (const doc of index) {
    const title = doc.title.toLowerCase()
    const desc = doc.description.toLowerCase()
    const headings = doc.headings.join(' ').toLowerCase()
    const body = doc.body.toLowerCase()

    let score = 0
    for (const t of terms) {
      if (title.includes(t)) score += title === t ? 12 : 8
      if (headings.includes(t)) score += 4
      if (desc.includes(t)) score += 3
      if (body.includes(t)) score += 1
    }
    if (score === 0) continue

    const hitField = desc || doc.body
    const idx = hitField.toLowerCase().indexOf(terms[0]!)
    const start = Math.max(0, idx - 30)
    const snippet = (start > 0 ? '...' : '') + hitField.slice(start, start + 120).trim()
    hits.push({ doc, score, snippet })
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `cd /Users/ksd/Desktop/CLI_UI && npx vitest run website/src/lib/search.test.ts`
Expected: PASS, all four cases.

- [ ] **Step 5: Commit**

```bash
cd /Users/ksd/Desktop/CLI_UI
git add -f website/src/lib/search.ts website/src/lib/search.test.ts
git commit -m "feat(search): dependency-free scored docs search function"
```

---

## Task 3: Search dialog, provider, and wiring

**Files:**
- Create: `website/src/components/docs/SearchDialog.tsx`, `website/src/components/docs/SearchProvider.tsx`, `website/src/styles/search.css`
- Modify: the nav or layout that renders `SearchTrigger`; `website/src/styles/global.css` (import)

**Interfaces:**
- Consumes: `searchDocs` (Task 2), `public/search-index.json` (Task 1), the existing `SearchTrigger` `onOpen` prop.
- Produces: `SearchProvider` (client) with `useSearch()` returning `{ open: () => void }`.

- [ ] **Step 1: Implement `SearchDialog.tsx`**

```tsx
'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { searchDocs, type SearchDoc, type SearchHit } from '@/lib/search'

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState<SearchDoc[] | null>(null)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Load the index lazily the first time the dialog opens.
  useEffect(() => {
    if (open && !index) {
      fetch('/search-index.json').then((r) => r.json()).then(setIndex).catch(() => setIndex([]))
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
  }, [open, index])

  const hits: SearchHit[] = useMemo(() => (index ? searchDocs(index, q) : []), [index, q])
  useEffect(() => { setActive(0) }, [q])

  if (!open) return null

  const go = (hit: SearchHit) => { onClose(); router.push(`/docs/${hit.doc.slug}`) }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && hits[active]) { e.preventDefault(); go(hits[active]!) }
  }

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <input
          ref={inputRef}
          className="search-input"
          placeholder="Search docs..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search docs"
        />
        <ul className="search-results">
          {hits.map((hit, i) => (
            <li key={hit.doc.slug}>
              <button
                className={`search-result${i === active ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(hit)}
                type="button"
              >
                <span className="search-result-title">{hit.doc.title}</span>
                <span className="search-result-section">{hit.doc.section}</span>
                <span className="search-result-snippet">{hit.snippet}</span>
              </button>
            </li>
          ))}
          {q && index && hits.length === 0 && <li className="search-empty">No results for "{q}"</li>}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement `SearchProvider.tsx`**

```tsx
'use client'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { SearchDialog } from './SearchDialog'

const Ctx = createContext<{ open: () => void }>({ open: () => {} })
export const useSearch = () => useContext(Ctx)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Ctx.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <SearchDialog open={open} onClose={close} />
    </Ctx.Provider>
  )
}
```

- [ ] **Step 3: Add `search.css`**

```css
.search-overlay {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 12vh;
  background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);
}
.search-modal {
  width: min(640px, 92vw);
  background: var(--bg-secondary);
  border: 1px solid var(--border-medium, rgba(60, 60, 96, 0.35));
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
}
.search-input {
  width: 100%; padding: 1.1rem 1.3rem;
  background: transparent; border: none; outline: none;
  color: var(--text-primary); font-family: var(--font-code); font-size: var(--text-base);
  border-bottom: 1px solid var(--border-subtle);
}
.search-results { list-style: none; margin: 0; padding: 0.5rem; max-height: 56vh; overflow-y: auto; }
.search-result {
  display: grid; grid-template-columns: 1fr auto; gap: 0.2rem 0.8rem;
  width: 100%; text-align: left; padding: 0.7rem 0.9rem;
  background: transparent; border: none; border-radius: 8px; cursor: pointer;
}
.search-result.is-active { background: var(--accent-glow, rgba(0, 255, 136, 0.12)); }
.search-result-title { color: var(--text-primary); font-weight: 600; }
.search-result-section {
  font-family: var(--font-code); font-size: var(--text-xs);
  color: var(--accent); text-transform: uppercase; letter-spacing: 0.05em;
}
.search-result-snippet { grid-column: 1 / -1; color: var(--text-muted); font-size: var(--text-sm); }
.search-empty { padding: 1rem; color: var(--text-muted); font-size: var(--text-sm); }
```

Import it in `website/src/styles/global.css` next to the other `@import` lines.

- [ ] **Step 4: Wire the provider and the trigger**

Find the component that renders `SearchTrigger` (grep `SearchTrigger`). It passes `onOpen`. Wrap the app or the nav subtree in `SearchProvider`, and have the `SearchTrigger`'s `onOpen` call `useSearch().open`. Concretely, in the navbar client component:

```tsx
import { useSearch } from '@/components/docs/SearchProvider'
// ...
const { open } = useSearch()
return <SearchTrigger onOpen={open} />
```

And in the root layout or the nearest client boundary, wrap children in `<SearchProvider>`. If the layout is a server component, create a thin client wrapper that renders `SearchProvider` and use it there.

- [ ] **Step 5: Type-check**

Run: `cd website && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Render-check the search**

```bash
cd /Users/ksd/Desktop/CLI_UI && bun scripts/build-registry.ts >/dev/null && cd website && node scripts/generate-llm-docs.mjs >/dev/null
(bun run dev >/tmp/next-search.log 2>&1 &) ; sleep 16
echo "index served: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/search-index.json --max-time 10)"
echo "index entries: $(curl -s http://localhost:3000/search-index.json --max-time 10 | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).length))")"
pkill -f "next dev"
```
Expected: index served 200, ~65 entries. Open the site in a browser, press Cmd+K, type "spinner", confirm a result links to a docs page. (Manual browser step; the curl confirms the index ships.)

- [ ] **Step 7: Commit**

```bash
cd /Users/ksd/Desktop/CLI_UI/website
git add -f website/src/components/docs/SearchDialog.tsx website/src/components/docs/SearchProvider.tsx website/src/styles/search.css website/src/styles/global.css
# plus the navbar/layout files you wired:
# git add -f <navbar file> <layout wrapper file>
git commit -m "feat(search): Cmd+K docs search dialog over the static index"
```

---

## Self-Review

**1. Spec coverage:** Cmd+K opens a dialog (Task 3 provider hotkey). Search runs over all 65 docs (Task 1 index, Task 2 scoring). Results link to docs pages (Task 3 `router.push`). The existing `SearchTrigger` is reused, not rebuilt.

**2. Placeholder scan:** No TBD. Every step has full code. The only manual step is the final browser keypress, which the curl index check backs up.

**3. Type consistency:** `SearchDoc` shape is identical across the index builder (Task 1 fields), the scoring function (Task 2), and the dialog (Task 3 fetch). `searchDocs(index, query, limit?)` signature matches every call site.

**Ponytail note:** No search dependency. A scored substring match covers 65 docs. The `search.ts` comment names the Orama upgrade point so a future scale-up is a one-file change, not a rewrite.
