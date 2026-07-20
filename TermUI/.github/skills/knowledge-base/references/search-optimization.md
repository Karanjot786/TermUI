<!-- Part of the Knowledge Base AbsolutelySkilled skill. Load this file when
     working with help center search configuration, relevance tuning, or
     zero-result query analysis. -->

# Search Optimization

Deep dive on making knowledge base content discoverable through search. Covers
ranking signals, synonym management, zero-result handling, and platform-specific
configuration.

---

## How help center search works

Most help center platforms (Zendesk, Intercom, HelpScout, Freshdesk, Confluence)
use a simplified search pipeline:

```
User query
  -> Tokenization (split into words, remove stop words)
  -> Synonym expansion (map user terms to official terms)
  -> Field-weighted matching (title > tags > body)
  -> Scoring (relevance + popularity + recency)
  -> Results ranked and returned
```

Unlike web search engines, help center search engines have limited NLP. They rely
heavily on exact and partial keyword matches. This means your optimization strategy
must focus on putting the right words in the right fields.

---

## Ranking signal weights

Typical weight distribution across help center platforms:

| Signal | Weight | What to optimize |
|---|---|---|
| Title match | Highest (3-5x body) | Use the exact query phrase users type |
| Tag / label match | High (2-3x body) | Add 3-5 synonym tags per article |
| Body content match | Baseline (1x) | Front-load key terms in the first 150 chars |
| Popularity (views) | Moderate boost | Promote important articles via in-app links |
| Recency | Moderate boost | Update articles regularly to maintain freshness signal |
| Helpful votes | Low-moderate boost | Improve article quality to earn positive votes |

### Title optimization tactics

The title is the single most impactful ranking factor. Optimize it by:

1. **Mirror user language** - Check search analytics for the top 5 query variations
   for each topic. Use the most common phrasing as the title.
2. **Lead with the action** - "Reset your password" ranks better for password-reset
   queries than "Password Management Overview".
3. **Include the object** - "Export your invoice as PDF" is more specific and
   searchable than "Export options".
4. **Skip articles and filler** - "Connect Slack integration" not "How to connect
   the Slack integration to your workspace".
5. **Test with real queries** - After updating a title, search for the top 3 user
   queries for that topic. The article should appear in the top 3 results.

---

## Synonym dictionary

A synonym dictionary maps user vocabulary to your official product terms. Without
it, users who search "bill" will not find articles titled "invoice".

### Building a synonym dictionary

1. **Mine search queries** - Export 90 days of search queries. Group queries that
   target the same article but use different words.
2. **Mine support tickets** - Look at how users describe problems in ticket
   subjects and bodies. Note non-standard terms.
3. **Map bidirectional pairs** - For each official term, list all user variants:

```yaml
synonyms:
  - canonical: "invoice"
    variants: ["bill", "receipt", "payment record", "statement"]
  - canonical: "sign in"
    variants: ["log in", "login", "sign on", "authenticate"]
  - canonical: "workspace"
    variants: ["organization", "org", "team", "company", "account"]
  - canonical: "integration"
    variants: ["connection", "plugin", "add-on", "app", "connector"]
  - canonical: "subscription"
    variants: ["plan", "membership", "license", "pricing tier"]
  - canonical: "permission"
    variants: ["access", "role", "privilege", "authorization"]
```

4. **Configure in your platform** - Most platforms support synonym configuration:
   - **Zendesk** - Admin > Search > Synonyms
   - **Intercom** - Settings > Help Center > Search synonyms
   - **Freshdesk** - Admin > Help Widget > Search settings
   - **Confluence** - Site admin > Search > Synonyms (Data Center only)

### Synonym maintenance

Review and expand the synonym dictionary monthly. New features introduce new
jargon gaps. Track zero-result queries as the primary source of missing synonyms.

---

## Zero-result query handling

A zero-result search means the user asked a question your knowledge base cannot
answer. Every zero-result query is either a content gap or a search configuration
gap.

### Weekly zero-result review process

1. **Export zero-result queries** - Most platforms provide this in search analytics.
2. **Classify each query**:

| Classification | Action |
|---|---|
| Content gap - no article exists | Create the article, add to content backlog |
| Synonym gap - article exists but uses different terms | Add the query terms as synonyms or tags |
| Typo / misspelling | Configure the platform's fuzzy matching or add common misspellings as synonyms |
| Out of scope - not a support question | No action needed, but monitor volume |

3. **Prioritize by frequency** - A zero-result query searched 50 times per week
   is more urgent than one searched twice.
4. **Track resolution** - After fixing, verify the query now returns relevant
   results. Recheck in the following week's report.

### Reducing zero-result rate

Target a zero-result rate below 10%. Healthy knowledge bases typically achieve
3-7%. If your rate is above 15%, prioritize synonym dictionary expansion and
content gap filling before any other knowledge base work.

---

## Search result page optimization

The search results page itself affects whether users find answers:

1. **Show snippet text** - Display the first 150-200 characters of the article body
   (or a custom meta description) below the title. This helps users evaluate
   relevance before clicking.
2. **Show category breadcrumbs** - "Billing > Invoices > Download your invoice"
   gives context that helps users pick the right result.
3. **Highlight matching terms** - Bold the matched query terms in the title and
   snippet to confirm relevance.
4. **Offer related suggestions** - When results are sparse (1-2 matches), show
   related articles or categories below the results.
5. **Provide a fallback CTA** - Below search results, always include: "Can't find
   what you're looking for? Contact support." This prevents dead-end frustration.

---

## Measuring search effectiveness

Track these search-specific metrics:

| Metric | Target | How to measure |
|---|---|---|
| Zero-result rate | < 10% | Searches with no results / total searches |
| Click-through rate | > 40% | Searches where user clicked a result / total searches |
| Search-to-ticket rate | < 15% | Users who searched then opened a ticket / users who searched |
| First-result accuracy | > 60% | Users who clicked the first result / users who clicked any result |
| Refinement rate | < 25% | Users who searched again after first search / total searchers |

A high refinement rate (users searching multiple times) indicates poor result
relevance or unclear article titles. A high search-to-ticket rate indicates
content gaps or unhelpful articles.

---

## Platform-specific search features

### Zendesk Guide

- Supports synonym configuration in admin panel
- Federated search across help center, community, and tickets
- Content cues suggest articles to create based on ticket trends
- Promoted search results (pin specific articles for specific queries)

### Intercom Articles

- AI-powered search with natural language understanding
- Article suggestions in the Messenger widget
- Resolution bot can suggest articles before showing search results
- Synonym support in search settings

### HelpScout Docs

- Beacon widget embeds search in-app
- Suggested articles based on page URL matching
- Search analytics dashboard with zero-result tracking
- Tag-based search boosting

### Freshdesk Knowledge Base

- AI-suggested articles during ticket creation
- Multi-language search with automatic language detection
- Article feedback integration with search ranking
- SEO settings for public-facing knowledge bases

---

## SEO for public knowledge bases

If your help center is publicly accessible and indexed by search engines, apply
these additional optimizations:

1. **Unique meta titles** - Format: "[Article title] | [Product name] Help Center"
2. **Meta descriptions** - Summarize the article in under 160 characters. Include
   the primary keyword and a benefit statement.
3. **Clean URLs** - `/help/billing/download-invoice` not `/help/article/12345`
4. **Schema markup** - Add FAQPage or HowTo structured data where applicable.
   This enables rich snippets in search results.
5. **Internal linking** - Link between related articles. This distributes page
   authority and helps search engines understand topic relationships.
6. **Canonical URLs** - If the same article appears in multiple categories, set a
   canonical URL to prevent duplicate content issues.
