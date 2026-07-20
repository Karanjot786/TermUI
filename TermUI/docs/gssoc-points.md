# GSSoC 2026: Points Reference

This is the canonical point table for **TermUI** GSSoC 2026 contributors. The same rules apply across GSSoC projects. The [welcome bot](../.github/workflows/gssoc-welcome.yml) links here.

> **Quick rule:** PRs without `gssoc:approved` earn **zero points**. Your reviewer applies this label after a successful review.

---

## Contributor formula

```
total = 50 + (difficulty x quality_multiplier) + type_bonus
```

- **50.** Base points for `gssoc:approved`.
- **difficulty.** Picked from `level:*`. 0 if none set.
- **quality_multiplier.** x 1.2 for `quality:clean`. x 1.5 for `quality:exceptional`. x 1.0 otherwise.
- **type_bonus.** Sum of all `type:*` labels. Stackable.

---

## Required label

| Label | Points | Set by |
|-------|--------|--------|
| `gssoc:approved` | **+50 base** | Maintainer, after review and merge |

---

## Difficulty (pick one)

| Label | Points | When to set |
|-------|--------|-------------|
| `level:beginner` | +20 | Trivial fix or doc change |
| `level:intermediate` | +35 | New widget. Non-trivial feature. |
| `level:advanced` | +55 | Cross-package refactor. Complex bug. |
| `level:critical` | +80 | Architectural change. Performance-critical work. |

Your reviewer sets this based on the actual complexity of the merged change, not the issue description.

---

## Quality multiplier (optional)

| Label | Multiplier | When to set |
|-------|------------|-------------|
| `quality:clean` | x 1.2 | Well-structured code. Tests cover edge cases. No review nits. |
| `quality:exceptional` | x 1.5 | Exemplary work. Better tests, docs, or API design than required. |

Neither set? Multiplier = 1.0.

---

## Type bonus (stackable, auto-applied from PR title)

| Title prefix | Label | Bonus |
|--------------|-------|-------|
| `docs:` | `type:docs` | +5 |
| `fix:` | `type:bug` | +10 |
| `feat:` | `type:feature` | +10 |
| `test:` | `type:testing` | +10 |
| `style:` | `type:design` | +10 |
| `refactor:` | `type:refactor` | +10 |
| `a11y:` | `type:accessibility` | +15 |
| `perf:` | `type:performance` | +15 |
| `ci:` / `build:` / `chore:` | `type:devops` | +15 |
| `security:` | `type:security` | +20 |

Multiple labels apply. Example: a security fix that also includes tests gets both. Auto-applied by [`gssoc-auto-label.yml`](../.github/workflows/gssoc-auto-label.yml).

---

## Worked examples

### Beginner doc fix

- `gssoc:approved` + `level:beginner` + `type:docs`
- `50 + (20 x 1.0) + 5 = 75 pts`

### Clean intermediate feature

- `gssoc:approved` + `level:intermediate` + `quality:clean` + `type:feature`
- `50 + (35 x 1.2) + 10 = 102 pts`

### Exceptional advanced refactor with tests

- `gssoc:approved` + `level:advanced` + `quality:exceptional` + `type:refactor` + `type:testing`
- `50 + (55 x 1.5) + 10 + 10 = 152.5 pts`

### Critical security fix with tests

- `gssoc:approved` + `level:critical` + `quality:exceptional` + `type:security` + `type:testing`
- `50 + (80 x 1.5) + 20 + 10 = 200 pts`

---

## Disqualifying labels

A PR with **any** of these earns zero points:

| Label | Meaning |
|-------|---------|
| `gssoc:invalid` | Violates rules. Example: no linked issue, no tests, broken build. |
| `gssoc:spam` | Duplicate, trivial whitespace change, or low-effort filler. |
| `gssoc:ai-slop` | Generated content with no real engagement. Fabricated logic or hallucinated API. |

Repeated assignment of these labels = removal from the program.

---

## Tier thresholds

| Points | Tier |
|--------|------|
| 500 | Bronze |
| 1,000 | Silver |
| 2,500 | Gold |
| 5,000 | Platinum |
| 10,000 | Diamond. Top 100 sits at top 0.4% of 35K applicants. |

---

## Mentor points (for reference)

You become a mentor in a future cohort. Your reward:

| Difficulty | Base | + `quality:clean` | + `quality:exceptional` |
|------------|------|-------------------|-------------------------|
| `level:beginner` | 10 | +5 | +10 |
| `level:intermediate` | 20 | +5 | +10 |
| `level:advanced` | 30 | +5 | +10 |
| `level:critical` | 50 | +5 | +10 |

A PR includes the `mentor:your-github-username` label for the mentor to receive credit.

---

## Source

This page reflects the rules from the [official GSSoC 2026 email](https://gssoc.girlscript.org/) and mirrors them locally for fast reference. GSSoC updates the formula. This page updates at the same time.
