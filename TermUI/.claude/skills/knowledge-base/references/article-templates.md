<!-- Part of the Knowledge Base AbsolutelySkilled skill. Load this file when
     writing, templating, or reviewing help center articles of any type. -->

# Article Templates

Ready-to-use templates for the four core knowledge base article types.
Copy the structure, adapt the content to your product, and follow the
checklist before publishing.

---

## How-to article template

Use for: step-by-step task completion ("How do I do X?")

```markdown
# [Action verb] [object] [optional context]

Examples:
  "Add a team member to your workspace"
  "Connect your Slack workspace"
  "Export project data as CSV"

[One sentence stating what the article helps the user accomplish.]

## Before you start

- [Prerequisite 1 - e.g., "You must be a workspace Admin"]
- [Prerequisite 2 - e.g., "The team member needs a valid email address"]

(Omit this section if there are no prerequisites.)

## Steps

1. Go to **Settings** > **Team Members**.
2. Click **Invite Member**.
3. Enter the team member's email address in the **Email** field.
4. Choose a role from the **Role** dropdown:
   - **Admin** - Full access to settings and billing
   - **Member** - Standard access to projects
   - **Viewer** - Read-only access
5. Click **Send Invitation**.

## What happens next

[Describe the outcome the user should see. Set expectations: confirmation
messages, emails, timing, or follow-up actions required.]

Example: "The team member receives an email invitation. They have 7 days
to accept before the link expires. Track pending invitations in
**Settings** > **Team Members** > **Pending** tab."

## Related articles

- [Manage team member roles and permissions](#)
- [Remove a team member from your workspace](#)
- [Understand workspace permission levels](#)
```

### How-to writing checklist

- [ ] Title starts with an action verb (Add, Create, Set up, Connect, Export, Reset)
- [ ] Opening sentence states the outcome, not the background
- [ ] Prerequisites listed before the steps (or section omitted if none)
- [ ] One action per numbered step - no compound steps ("Click X and then Y")
- [ ] UI element names bolded exactly as they appear in the product
- [ ] Sub-options formatted as indented bullet list inside the relevant step
- [ ] "What happens next" section sets expectations after the last step
- [ ] 2-3 related articles linked at the bottom
- [ ] Word count: 150-400 words

---

## Troubleshooting article template

Use for: diagnosing and resolving a specific error or broken behavior ("X is not working")

```markdown
# [Problem statement in the user's own words]

Examples:
  "I can't log in to my account"
  "My CSV export is empty"
  "Team members aren't receiving invitation emails"

[One sentence acknowledging the problem and stating that this article
covers the most common causes and fixes.]

## Common causes

This usually happens because:

- [Cause 1 - most frequent, simplest to fix]
- [Cause 2]
- [Cause 3 - least frequent or most complex]

## Fix 1: [Short label for Cause 1]

[One sentence confirming this cause and who it applies to.]

1. [Diagnostic step to confirm this is the cause]
2. [Fix step]
3. [Verification step - what the user sees when it works]

## Fix 2: [Short label for Cause 2]

1. [Diagnostic step]
2. [Fix step]
3. [Verification step]

## Fix 3: [Short label for Cause 3]

1. [Diagnostic step]
2. [Fix step]
3. [Verification step]

## Still not working?

If none of the fixes above resolved the issue, contact support and include:

- Your account email address
- The error message you see (paste the exact text or attach a screenshot)
- Browser name and version, or device and OS if on mobile
- The steps you already tried
```

### Troubleshooting writing checklist

- [ ] Title matches how the user describes the problem - not the technical root cause
- [ ] Causes listed in order of likelihood (most common first)
- [ ] Each fix is self-contained - a user can jump directly to Fix 2 without reading Fix 1
- [ ] Every fix ends with a verification step so the user knows whether it worked
- [ ] Escalation path at the bottom includes the exact information support needs
- [ ] Word count: 200-600 words

---

## FAQ article template

Use for: short, direct answers to common factual questions about a topic

```markdown
# Frequently asked questions: [topic]

Examples:
  "Frequently asked questions: billing"
  "Frequently asked questions: workspace permissions"

---

## [Question as the user would ask it]

Examples:
  "How do I cancel my subscription?"
  "Can I change my billing email address?"
  "What happens to my data if I downgrade?"

[Direct answer in 1-3 sentences. If the answer requires more than 150 words,
it belongs in a standalone how-to article. Link to it instead.]

---

## [Next question]

[Direct answer.]

---

## [Next question]

[Direct answer.]
```

### FAQ writing rules

- Maximum 10 questions per page. Beyond that, split by subtopic or create individual articles.
- Answer in the first sentence. Never open with context or "Great question!".
- Write questions in first person as the user would ask them: "How do I..." not "How to..."
- Order by frequency (most asked first), not alphabetically.
- If an answer needs a numbered list of steps, convert it to a how-to article and link to it.
- Every FAQ page should have a "Didn't find your answer?" link to contact support at the bottom.

---

## Reference article template

Use for: complete specs, settings tables, limits, permissions matrices, or glossaries

```markdown
# [Feature or setting name] reference

[One sentence describing what this reference covers and who uses it.]

Example: "This page lists all permission levels in [Product], what each role
can access, and which plan each role is available on."

---

## [Section heading, e.g., "Permission levels"]

| [Column 1] | [Column 2] | [Column 3] |
|---|---|---|
| [Value] | [Description] | [Notes or plan availability] |
| [Value] | [Description] | [Notes] |

---

## [Next section, e.g., "Rate limits"]

| [Column 1] | [Column 2] |
|---|---|
| [Endpoint or action] | [Limit] |

---

## [Next section, e.g., "Glossary"]

**[Term]**
[Definition in 1-2 sentences.]

**[Term]**
[Definition.]

---

## Related articles

- [How-to article that uses these settings]
- [Troubleshooting article for common configuration errors]
```

### Reference writing rules

- Open with a one-sentence scope statement - what the table covers and who it is for.
- Use tables for anything with 3+ rows and 2+ columns. Prose lists are harder to scan.
- Every table needs a header row with clear column names.
- Add a "Notes" or "Plan availability" column whenever a value is conditional.
- Link to the how-to or troubleshooting article that uses these settings - reference articles alone don't tell users what to do.
- Add anchor links (`## Section name`) to every major section when the page exceeds 500 words.
- Word count: no target - as complete as needed. Use anchor navigation, not length limits.

---

## Style guide: rules that apply to all article types

| Rule | Do this | Not this |
|---|---|---|
| Person | "You can export your data from Settings" | "Users can export their data" |
| Voice | Active: "Click **Save** to apply changes" | Passive: "Changes are applied when Save is clicked" |
| Tense | Present: "Your file downloads automatically" | Future: "Your file will be downloaded" |
| UI labels | Bold exact label: "Click **Export data**" | Describe location: "click the export button in the top-right" |
| Sentence length | Under 25 words | Compound sentences joined with multiple "and" or "but" clauses |
| Screenshots | Add when UI placement is ambiguous | Add for every step (screenshots go stale fast) |
| Jargon | Use the exact term shown in the product UI | Invent synonyms or shorthand not used in the product |
| Tone | Direct and instructional: "Go to..." "Click..." "Enter..." | Conversational padding: "First, you'll want to..." "Go ahead and click..." |
