<!-- Part of the Knowledge Base AbsolutelySkilled skill. Load this file when
     working with help center structure, multi-product setups, multilingual
     content, or role-based knowledge base design. -->

# Help Center Architecture

Detailed patterns for designing help center information architecture across
common complexity scenarios: multi-product, multi-role, multilingual, and
high-scale knowledge bases.

---

## Single-product help center

The simplest and most common pattern. One product, one audience, one help center.

### Recommended category structure

```
Help Center
  Getting Started
    - Quick start guide
    - System requirements
    - First-time setup
  Account & Settings
    - Profile settings
    - Password and security
    - Notification preferences
  [Core Feature 1]
    - [Subtopic articles]
  [Core Feature 2]
    - [Subtopic articles]
  Billing & Payments
    - Plans and pricing
    - Invoices and receipts
    - Payment methods
    - Cancellation and refunds
  Integrations
    - [Per-integration articles]
  Troubleshooting
    - [Common issues organized by symptom]
```

### Design rules for single-product

- **5-9 top-level categories** - Fewer than 5 feels incomplete; more than 9
  overwhelms navigation. If you have more than 9, you probably need subcategories.
- **Getting Started always first** - New users scan left-to-right, top-to-bottom.
  Put onboarding content where they look first.
- **Troubleshooting as a catch-all** - Users who cannot find their answer in a
  feature category will look here. Organize by symptom, not by cause.
- **Billing always present** - Even if you think billing is simple, users will
  search for it. Give it its own category.

---

## Multi-product help center

When your company has multiple distinct products that share a help center.

### Pattern A: Product-first navigation

```
Help Center
  [Product A]
    Getting Started
    Features
    Billing
    Troubleshooting
  [Product B]
    Getting Started
    Features
    Billing
    Troubleshooting
  [Shared / Platform]
    Account management
    SSO and security
    API reference
```

**Best for:** Products with distinct user bases and minimal overlap. Users of
Product A rarely need Product B content.

### Pattern B: Topic-first with product filters

```
Help Center
  Getting Started
    - Getting started with Product A
    - Getting started with Product B
  Account & Settings (shared)
  Billing (shared or per-product)
  [Topic 1]
    - Product A: [article]
    - Product B: [article]
  [Topic 2]
    ...
```

**Best for:** Products that share concepts and users frequently use both. Reduces
duplication of shared content (account, billing, SSO).

### Choosing between patterns

| Factor | Product-first | Topic-first |
|---|---|---|
| User overlap | Low (separate audiences) | High (same users, both products) |
| Shared features | Few | Many (shared auth, billing, API) |
| Content volume | Large per product (50+ articles each) | Moderate per product (< 50 each) |
| Maintenance cost | Higher (duplicated shared content) | Lower (shared content in one place) |

---

## Role-based help center

When different user roles need different content (e.g., admin vs end-user,
buyer vs seller, teacher vs student).

### Pattern: Role-based sections with shared core

```
Help Center
  For Admins
    - Admin setup guide
    - Managing users
    - Security settings
    - Billing and invoices
    - Audit logs
  For Team Members
    - Getting started
    - Daily workflows
    - Collaboration features
    - Personal settings
  General
    - Account basics
    - System requirements
    - Contact support
```

### Implementation guidelines

1. **Identify the role split** - Only create role sections when content divergence
   is significant (> 30% of articles are role-specific). For minor differences,
   use callout boxes within shared articles: "Admin only: You can also..."
2. **Shared content stays shared** - Do not duplicate articles that apply to all
   roles. Place them in a shared section or link from role sections.
3. **Default to the most common role** - If 80% of users are end-users and 20%
   are admins, make end-user content the default experience. Admin content gets
   its own section.
4. **Search should cross boundaries** - When a user searches, show results from
   all sections (with role labels), not just their assumed role.

---

## Multilingual help center

When your knowledge base needs to serve users in multiple languages.

### Tier system for translation priority

Not all articles need translation into all languages. Use a tier system:

| Tier | Content | Translation priority |
|---|---|---|
| Tier 1 | Getting started, billing, top 20 articles by traffic | Translate into all supported languages |
| Tier 2 | Feature articles for features available in that locale | Translate into languages where the feature is available |
| Tier 3 | Advanced, niche, or low-traffic articles | English only, translate on demand |

### Architecture decisions

1. **Subdomain vs subdirectory vs URL parameter**
   - Subdomain: `fr.help.example.com` - Clean separation, SEO-friendly
   - Subdirectory: `help.example.com/fr/` - Easier to manage, shares domain authority
   - URL parameter: `help.example.com?lang=fr` - Avoid; poor SEO, confusing URLs
   - **Recommendation:** Subdirectory for most help centers. Subdomain only if
     you have dedicated localization teams per language.

2. **Fallback behavior** - When an article is not translated, show the English
   version with a banner: "This article is not yet available in [language].
   Showing the English version." Never show a 404.

3. **Language detection** - Auto-detect from browser locale, but always provide
   a manual language switcher. Never force a language based on IP geolocation
   alone (users travel, use VPNs).

4. **Search per language** - Search should default to the user's selected language
   but optionally include English results when the translated knowledge base has
   coverage gaps.

### Translation workflow

```
1. Author writes article in primary language (usually English)
2. Article is marked "ready for translation"
3. Translation team or service translates Tier 1 content first
4. Translated article is reviewed by a native speaker (not just a translator)
5. Published with cross-links to other language versions
6. When the source article is updated, translated versions are flagged for re-review
```

---

## High-scale knowledge base (500+ articles)

At scale, standard flat navigation breaks down. Apply these patterns:

### 1. Faceted navigation

Add filters alongside category navigation:
- **Product** (for multi-product)
- **Role** (admin, user, developer)
- **Content type** (how-to, troubleshooting, reference, video)
- **Feature area** (subset of categories)

### 2. Smart search with auto-suggest

At 500+ articles, browsing becomes impractical. Search becomes the primary
navigation method. Invest in:
- Auto-complete that suggests article titles as the user types
- Popular/trending queries shown before the user types
- Recent articles shown as suggestions for returning users

### 3. Content governance model

| Role | Responsibility | Cadence |
|---|---|---|
| Knowledge manager | Owns taxonomy, review cycles, quality bar | Ongoing |
| Content owners (per category) | Write and update articles in their domain | Weekly |
| Support team | Flag inaccurate articles, suggest new content | Per ticket |
| Product team | Notify knowledge team of feature changes pre-launch | Per release |

### 4. Article lifecycle management

```
Draft -> Review -> Published -> [Active lifecycle] -> Stale -> Review -> Updated
                                                             -> Archived/Retired
```

- **Published articles** get a mandatory review date (3-6 months from publish)
- **Stale articles** (past review date) are flagged in the CMS dashboard
- **Archived articles** are removed from navigation and search but preserved
  with a redirect to the replacement article or a "This article has been retired"
  notice

### 5. Content reuse

For shared content that appears in multiple articles (e.g., "How to access
admin settings" is referenced in 15 articles):
- Use content snippets / includes if your platform supports them (Zendesk dynamic
  content, Confluence includes, custom CMS components)
- If not supported, write the shared content in one canonical article and link to
  it from others. Do not copy-paste.

---

## Migration planning

When moving from one help center platform to another:

### Pre-migration checklist

1. **Inventory all content** - Export every article with metadata: title, category,
   URL, views, last updated, author, language.
2. **Audit before migration** - Do not migrate stale or duplicate content. Clean
   up first; migrate less.
3. **Map URL structure** - Plan the new URL scheme. Create a redirect map from
   every old URL to every new URL. 301 redirects are mandatory.
4. **Test search** - After migration, test the top 50 search queries from your
   old platform against the new one. Verify results are comparable.
5. **Preserve analytics** - Set up tracking on the new platform before launch.
   Establish a baseline for comparison.
6. **Communicate the change** - Notify users (banner, email) and internal teams
   (support, sales) about the new help center URL and any navigation changes.

### Common migration pitfalls

| Pitfall | Impact | Prevention |
|---|---|---|
| Missing redirects | Broken links from search engines, bookmarks, and in-app help links | Create redirect map before launch; test every old URL |
| Migrating everything | Stale content pollutes the new platform | Audit and prune before migration |
| Ignoring search config | Synonyms, boosted articles, and promoted results do not transfer | Rebuild search configuration manually on the new platform |
| Format loss | Rich content (tables, callouts, embedded media) may render differently | Test a sample of complex articles on the new platform first |
