<!-- Part of the keyword-research AbsolutelySkilled skill. Load this file when
     classifying search intent for a keyword list, writing content briefs, or
     validating intent assumptions from SERP data. -->

# Search Intent Mapping

Search intent (also called user intent or query intent) is the underlying goal a
person has when they type a query into a search engine. Google's core mission is to
match results to intent, which means intent is the single most important dimension
of any keyword. A technically well-optimized page targeting the wrong intent will
not rank because it does not satisfy what the searcher needs.

---

## The four intent types

### Informational

The searcher wants to learn, understand, or find an answer. No immediate action is
implied. These are the highest volume queries on the web.

**Signals:**
- Question words: "how", "what", "why", "when", "who", "where"
- Explanatory phrases: "guide to", "tutorial", "explained", "definition of", "examples of"
- Research phrases: "statistics on", "history of", "overview of"

**Examples:**
- "how does compound interest work"
- "what is a product-led growth strategy"
- "why is my React app re-rendering"
- "JavaScript closures explained"

**Content types Google rewards:**
- Long-form guides and tutorials
- How-to articles with step-by-step structure
- Definitions and explainers
- FAQ pages
- Wikipedia-style reference articles

**Conversion potential:** Low to medium. Informational content builds awareness
and trust, feeds remarketing audiences, and earns backlinks. It rarely converts
directly but is essential for top-of-funnel and authority building.

---

### Navigational

The searcher already knows where they want to go and is using the search engine
as a shortcut to get there. They have a specific destination in mind.

**Signals:**
- Brand names: "Stripe dashboard", "Notion login", "Figma"
- Site-specific phrases: "GitHub repo for X", "Ahrefs keyword explorer"
- Destination phrases: "sign in", "login", "account", "download"

**Examples:**
- "Notion templates"
- "Vercel dashboard login"
- "Tailwind CSS docs"
- "react-query GitHub"

**Content types Google rewards:**
- Official brand homepages
- Login and account pages
- Official documentation sites
- Official download pages

**Conversion potential:** Very high for your own brand (the searcher is already
a user). Very low for competitors' brand terms - do not waste resources trying
to rank for "Salesforce login" unless you are Salesforce.

**Key rule:** Do not build content targeting competitors' pure brand navigational
terms. Comparison pages ("X vs Salesforce") work; pure navigational terms do not.

---

### Transactional

The searcher is ready to take a specific action, often a purchase, signup, or
download. Intent to convert is explicit.

**Signals:**
- Purchase intent: "buy", "order", "purchase", "shop for"
- Conversion intent: "sign up", "get started", "free trial", "download"
- Deal signals: "coupon", "discount", "promo code", "deal", "cheap"
- Subscription signals: "pricing", "plans", "subscription"

**Examples:**
- "buy mechanical keyboard online"
- "Notion pricing"
- "free project management software"
- "HubSpot free trial"
- "Figma discount code"

**Content types Google rewards:**
- Product pages with clear CTAs
- Pricing pages
- Free trial / signup landing pages
- Category/collection pages (e-commerce)
- Service pages with contact forms

**Conversion potential:** Highest of all four types. These searchers have money
or action intent. Optimize for clarity, trust signals, and minimal friction.

---

### Commercial Investigation

The searcher is evaluating options before committing. They know the category or
problem but are researching which solution to choose. This is the "consideration"
stage of the funnel.

**Signals:**
- Comparison: "vs", "versus", "or", "compared to", "difference between"
- Evaluation: "best", "top", "review", "reviews", "rated", "recommended"
- Alternatives: "alternative to", "instead of", "like X but"
- Use-case qualifying: "for small business", "for developers", "for teams"

**Examples:**
- "best CRM for startups"
- "Ahrefs vs Semrush"
- "Notion alternatives for project management"
- "Stripe reviews"
- "top email marketing tools 2024"

**Content types Google rewards:**
- "Best X" listicles and comparison guides
- Side-by-side comparison tables
- Review articles with pros/cons
- Use-case landing pages
- Buyer's guides

**Conversion potential:** High. The searcher is actively deciding. Content here
is some of the most valuable in the funnel - it captures buyers at decision time
and can include affiliate links, CTAs to trials, or soft conversion offers.

---

## How to classify intent from SERP features

When modifier words are absent or ambiguous, the SERP itself is the ground truth.
Analyze the top 3-5 results:

| SERP signal | Likely intent |
|---|---|
| All results are product/service pages | Transactional |
| All results are "best X" or comparison articles | Commercial investigation |
| All results are how-to guides, tutorials, or explainers | Informational |
| Top result is the brand's homepage or login page | Navigational |
| Mix of product pages and review articles | Transactional + commercial investigation |
| Mix of guides and product pages | Informational + transactional (blended) |
| Featured snippet with a definition | Informational |
| Featured snippet with a step list | Informational (task-oriented) |
| Shopping carousel at the top | Transactional (strong product signal) |
| Local pack (map + 3 businesses) | Transactional with local modifier |

**SERP features as secondary signals:**

- **People Also Ask (PAA)** - PAA questions are almost always informational sub-intents
  within the main query. They are subheading opportunities regardless of the primary intent.
- **Video carousel** - Strong signal that the audience prefers video. Consider a
  companion video or a YouTube-embedded section in your article.
- **Image pack** - Visual intent. Include strong imagery and optimize alt text.
- **Knowledge panel** - Entity/brand query. Content strategy here is brand PR, not SEO.
- **Sitelinks** - Navigational signal; the brand is dominant for this query.

---

## Intent-to-content-type mapping matrix

| Intent | Primary format | Page type | CTA type |
|---|---|---|---|
| Informational | Long-form guide, how-to, explainer | Blog post, wiki, resource hub | Newsletter signup, content upgrade, internal links |
| Navigational | Brand page, login, docs | Homepage, login page, docs site | None (user already committed) |
| Transactional | Product/service page, category page | Product page, pricing page, signup landing | Buy now, start free trial, add to cart |
| Commercial investigation | Listicle, comparison, review | "Best X" article, versus page, buyer's guide | Soft CTA: "see pricing", "compare plans", affiliate link |

**Blended intent pages** - Some keywords require satisfying two intents in one page.
"Email marketing pricing" is both transactional (show me plans) and commercial
investigation (how does it compare?). In these cases, lead with the primary intent
in the hero section and address the secondary intent in a supporting section below.

---

## Validating intent assumptions

Assumptions made from keyword modifiers are sometimes wrong. Always validate against
the live SERP before committing to a content format.

**Common false assumptions:**

- "Email marketing" sounds informational but the SERP is dominated by tool homepages -
  it has a strong navigational/commercial intent overlay.
- "Notion" sounds navigational (brand name) but also returns templates, tutorials, and
  feature comparison content - there is informational intent in the mix.
- "Best practices for X" sounds informational but for some categories Google favors
  product comparison pages because searchers want tool recommendations.

**Validation checklist:**
1. Search the keyword in an incognito window (or use a rank tracker with SERP preview).
2. Note the content type of results 1, 2, and 3 (article, product page, video, etc.).
3. Note the average content length (use a word count tool on 3-5 top results).
4. Check whether a featured snippet is present and what format it uses (paragraph, list, table).
5. Note any special SERP features (PAA, video, shopping, local pack).
6. Update your intent classification and content format before writing the brief.

**Intent mismatch consequences:**
- Writing a how-to guide for a keyword where Google ranks product pages = won't rank
- Writing a product page for a keyword where Google ranks comparison articles = won't rank
- Writing a 500-word definition for a keyword where the top results average 3,000 words = won't rank

Always let the SERP tell you the format. Your job is to produce the best version of
what is already working, not to invent a new format.

---

## Assigning intent to a full keyword list

When you have 50-500 keywords to classify, use this workflow:

1. **Auto-classify by modifier scan** - Write a simple rule: if the keyword contains
   any of [buy, order, purchase, pricing, discount, coupon, free trial] -> transactional.
   If it contains [best, vs, review, alternative, compared] -> commercial investigation.
   If it contains [how, what, why, when, guide, tutorial, explained] -> informational.
   If it contains [brand name, login, sign in, download] -> navigational.

2. **Flag ambiguous keywords** - Any keyword that fires zero rules or fires multiple
   conflicting rules needs manual SERP review. These are typically 10-20% of a list.

3. **Batch-verify the auto-classified results** - Spot-check 5-10 keywords from each
   intent category against the live SERP. If your auto-classification is wrong more
   than 20% of the time, refine your modifier lists.

4. **Output a classification table** with columns:
   `keyword | primary_intent | secondary_intent | content_type | priority`

This classification table becomes the input to your content calendar and content
brief creation process.

---

## Intent signals for AEO and GEO surfaces

Traditional intent classification maps keywords to content types for organic search.
In tri-surface keyword research, intent also determines which non-organic surfaces
are viable for a keyword. Not every intent type works on every surface.

### Intent-to-surface mapping

| Intent type | Organic | AEO (snippets/PAA/voice) | GEO (AI citations) | Notes |
|---|---|---|---|---|
| Informational | High | High | High | Best tri-surface opportunity. AI engines answer informational queries extensively and cite sources. Snippets fire frequently. |
| Commercial investigation | High | Medium | High | AI engines produce detailed comparison answers with citations. Snippets are less common (Google prefers showing multiple results) but PAA is active. |
| Transactional | High | Low | Low | Snippets rarely fire for "buy X" queries. AI Overviews usually don't appear for direct purchase intent - Google shows shopping results instead. |
| Navigational | Low (unless your brand) | None | None | AI engines redirect to the brand. No snippet or AI citation opportunity for third parties. |

### How intent affects AEO scoring

**High AEO intent signals:**
- Question-format queries ("how to", "what is", "why does") - these directly trigger
  featured snippets and are natural voice search patterns
- Definition queries ("X definition", "X meaning", "what is X") - paragraph snippets
- Process queries ("how to X step by step") - list snippets
- Comparison queries with clear structure ("X vs Y") - table snippets
- "Best" queries with listicle format - list snippets

**Low/zero AEO intent signals:**
- Brand navigational queries - no snippet opportunity
- Direct purchase queries ("buy X", "order X") - shopping results, not snippets
- Login/account queries - Google shows the brand's page directly
- Price-only queries ("X pricing") - sometimes a snippet, but usually product page

### How intent affects GEO scoring

**High GEO intent signals:**
- Multi-factor evaluation queries ("best X for Y") - AI engines love producing
  structured comparisons and cite multiple sources
- How-to queries with multiple steps - AI engines generate step-by-step answers
  and cite authoritative guides
- "Explain" queries ("how does X work") - AI engines synthesize explanations
  from multiple cited sources
- Emerging topic queries - AI engines pull from recent sources when training
  data is insufficient, increasing citation opportunity

**Low/zero GEO intent signals:**
- Simple factual queries ("population of France") - AI answers from training
  data without citations
- Navigational queries - AI engines redirect, don't generate answers
- Very recent event queries - AI engines may not have indexed recent sources
- Highly subjective queries ("is X worth it") - AI engines are cautious and
  may not generate an answer at all

---

## AI Overview intent patterns

Google AI Overviews and other AI search engines do not fire equally across all
query types. Understanding which patterns trigger AI answers helps you predict
GEO opportunity during keyword research.

### Query types that consistently trigger AI Overviews

| Query pattern | Example | AI Overview behavior |
|---|---|---|
| "How to" process queries | "how to set up a home network" | Detailed step-by-step answer with 3-6 citations |
| "What is" explainer queries | "what is retrieval augmented generation" | Definition + context with 2-4 citations |
| "Best X for Y" comparisons | "best project management tool for remote teams" | Structured comparison with 4-8 citations |
| "X vs Y" comparisons | "PostgreSQL vs MySQL for web apps" | Side-by-side analysis with 3-5 citations |
| Multi-factor decision queries | "should I use TypeScript or JavaScript" | Pros/cons analysis with 3-6 citations |
| Complex informational queries | "how does mRNA vaccine technology work" | Detailed explanation with 4-7 citations |

### Query types that rarely trigger AI Overviews

| Query pattern | Example | Why AI Overview doesn't fire |
|---|---|---|
| Direct purchase intent | "buy iPhone 16 Pro" | Google serves shopping results instead |
| Brand navigational | "Netflix login" | Direct link is more useful |
| Simple factual | "height of Mount Everest" | Knowledge panel handles this |
| Very local queries | "pizza near me" | Local pack is more appropriate |
| Current news/events | "election results today" | Top stories/news box serves this |
| YMYL health/finance (sometimes) | "should I take aspirin daily" | Google is cautious with AI answers on health/finance topics |

### Using AI Overview patterns in keyword research

During the research phase, use these patterns to quickly estimate GEO potential:
1. If a keyword matches a "consistently triggers" pattern, start with GEO score 5+
2. If a keyword matches a "rarely triggers" pattern, start with GEO score 0-2
3. Always verify with a manual search - patterns have exceptions
4. For borderline keywords, test on both Google and Perplexity - if either fires
   a detailed cited answer, there is GEO opportunity
