<!-- Part of the keyword-research AbsolutelySkilled skill. Load this file when
     scoring keywords across organic, AEO, and GEO surfaces, or when producing
     a tri-surface keyword research report. -->

# Tri-Surface Keyword Scoring

In 2026, every keyword can drive traffic from three distinct surfaces: traditional organic blue links (SEO), answer engine features like featured snippets, People Also Ask, and voice results (AEO), and AI-generated search results from Google AI Overviews, ChatGPT Search, and Perplexity (GEO). Scoring a keyword on all three surfaces reveals where the real opportunity lies - some keywords are best won organically, others through snippet capture, and others by earning AI citations. This reference defines the scoring rubrics for each surface and a composite scoring method.

---

## Why tri-surface scoring matters

Traditional keyword research only evaluates organic ranking opportunity. You look at search volume, keyword difficulty, and intent alignment, then decide whether to pursue the keyword based on whether you can realistically rank on page one. This single-surface view was sufficient when organic blue links captured the vast majority of clicks on the results page. That is no longer the case.

Answer engines now serve direct answers for roughly 30-40% of informational queries. Featured snippets, People Also Ask boxes, and voice search results pull users away from clicking through to organic listings. If you rank #3 organically but someone else holds the featured snippet, your effective click-through rate drops significantly. Meanwhile, AI search engines - Google AI Overviews, ChatGPT Search, and Perplexity - are creating an entirely new traffic channel by citing sources in their generated answers. Being cited in an AI Overview is functionally a new kind of "ranking" that exists outside the traditional ten blue links.

A keyword might have low organic opportunity (KD 80+) but high AEO opportunity (no featured snippet holder, strong PAA presence) or high GEO opportunity (AI Overview fires consistently but cites weak, outdated sources you could displace). Evaluating all three surfaces prevents blind spots and reveals non-obvious wins. Without tri-surface scoring, you might skip a keyword because organic difficulty is too high, completely missing that it represents a wide-open opportunity on answer engine or AI-generated surfaces.

---

## Surface 1: Organic Opportunity Score (0-10)

Score each keyword on its traditional organic ranking potential.

### Rubric

| Factor | Weight | Scoring |
|---|---|---|
| Traffic potential | 3 | 0 = <100/mo, 1 = 100-500, 2 = 500-2K, 3 = 2K+ |
| KD inversion | 3 | 0 = KD 70+, 1 = KD 50-69, 2 = KD 30-49, 3 = KD <30 |
| Intent-business alignment | 2 | 0 = no match, 1 = awareness only, 2 = consideration/commercial |
| Content gap exists | 2 | 0 = top 3 results are strong, 1 = gaps in top 10, 2 = clear content gap |

**Score = sum of (factor score * weight) / max possible * 10, rounded to nearest integer**

Simplified: add up the weighted scores. Max raw = 30. Divide by 3 to get 0-10.

### How to evaluate

- Traffic potential: use Ahrefs/Semrush traffic potential metric (not raw volume)
- KD inversion: lower difficulty = higher score (inverted because easy = more opportunity)
- Intent alignment: does this keyword's intent match a page type you offer or plan to create?
- Content gap: are the current top results thin, outdated, or mismatched to intent?

---

## Surface 2: AEO Opportunity Score (0-10)

Score each keyword on its potential for winning answer engine features (featured snippets, PAA, voice results).

### Rubric

| Factor | Weight | Scoring |
|---|---|---|
| Snippet presence | 2 | 0 = no snippet possible (navigational/transactional), 1 = snippet exists with strong holder, 2 = snippet exists with weak/no holder OR no snippet yet on eligible query |
| Format match | 2 | 0 = your content can't match the snippet format, 1 = partial match, 2 = you can produce the exact format (paragraph, list, table) |
| PAA count | 2 | 0 = no PAA, 1 = 1-3 PAA questions, 2 = 4+ PAA questions (more PAA = more entry points) |
| Voice search likelihood | 2 | 0 = unlikely voice query, 1 = possible, 2 = natural spoken question pattern |
| Current holder strength | 2 | 0 = held by a top-3 authority domain (Wikipedia, gov), 1 = held by a mid-authority site, 2 = no holder or held by low-authority site |

**Score = sum of (factor score * weight) / max possible * 10, rounded to nearest integer**

Max raw = 20. Divide by 2 to get 0-10.

### How to evaluate

- Snippet presence: search the keyword and check if a featured snippet appears; note format
- Format match: can you create a concise paragraph answer (40-60 words), a numbered list, or a table that matches?
- PAA count: count People Also Ask boxes on the SERP
- Voice likelihood: question-format queries ("how do I...", "what is...") are voice-likely
- Holder strength: who currently holds the snippet? A DR 90 site is hard to displace; a DR 30 blog is vulnerable

### Key insight

An AEO score of 0 is correct for navigational and most transactional keywords - snippets don't fire for "buy X" or "brand login". Do not force an AEO score onto keywords where answer features are irrelevant.

---

## Surface 3: GEO Opportunity Score (0-10)

Score each keyword on its potential for earning citations in AI-generated search results.

### Rubric

| Factor | Weight | Scoring |
|---|---|---|
| AI Overview trigger | 3 | 0 = no AI Overview fires for this query, 1 = AI Overview fires sometimes, 2 = AI Overview fires consistently, 3 = fires on Google + ChatGPT Search/Perplexity |
| Citation density | 2 | 0 = AI answer cites 0-1 sources, 1 = cites 2-3 sources, 2 = cites 4+ sources (more citations = more opportunity for you to be one) |
| Query type match | 2 | 0 = query type AI engines skip (navigational, very simple), 1 = AI engines summarize but rarely cite deeply, 2 = AI engines provide detailed cited answers (comparisons, how-tos, multi-step) |
| Entity/topical relevance | 1 | 0 = your site has no topical authority here, 1 = some, 2 = strong entity match |
| Content uniqueness | 2 | 0 = your content would be generic/duplicative, 1 = somewhat differentiated, 2 = unique data, original research, or proprietary insight |

**Score = sum of (factor score * weight) / max possible * 10, rounded to nearest integer**

Max raw = 20. Divide by 2 to get 0-10.

### How to evaluate

- AI Overview trigger: search the keyword on Google (logged out) and check if AI Overview appears; also test on ChatGPT Search or Perplexity
- Citation density: count how many source links the AI answer includes
- Query type match: comparison queries, multi-factor evaluations, and "how to" queries tend to trigger detailed AI answers with citations; simple factual queries get one-line answers with fewer citation opportunities
- Entity relevance: does your site have established authority on this topic? AI engines prefer citing known entities
- Content uniqueness: AI engines cite sources that add information beyond what's already in their training data - original research, proprietary data, unique frameworks, and first-party case studies get cited more

### Critical rule: GEO = 0 when no AI Overview fires

If you search a keyword and no AI Overview, ChatGPT Search answer, or Perplexity answer appears, the GEO score is 0. Do not speculate about future AI coverage - score based on current observable behavior. Re-evaluate quarterly as AI search coverage expands.

---

## Composite Score and Priority Surface

### Calculating the composite score

The composite score is the simple sum of the three surface scores:

```
Composite Score = Organic Score + AEO Score + GEO Score
```

Range: 0-30. Higher = more total opportunity across all surfaces.

### Applying business-goal weighting

Not all surfaces matter equally to every business. Apply a multiplier based on your primary goal:

| Business goal | Organic weight | AEO weight | GEO weight |
|---|---|---|---|
| Maximum traffic volume | 1.5 | 1.0 | 0.8 |
| Brand authority / thought leadership | 1.0 | 0.8 | 1.5 |
| Lead generation / conversions | 1.2 | 1.2 | 0.8 |
| Awareness in AI-first audiences | 0.8 | 1.0 | 1.5 |
| Balanced / default | 1.0 | 1.0 | 1.0 |

Weighted composite = (Organic * Ow) + (AEO * Aw) + (GEO * Gw)

### Determining priority surface

After scoring, assign a **priority surface** to each keyword:

- If one surface score is 3+ points higher than both others: that surface is priority
- If two surfaces are within 2 points and both above 5: dual-surface opportunity
- If all three are within 2 points and above 4: full tri-surface opportunity
- If all scores are below 3: low opportunity keyword - deprioritize

The priority surface informs which optimization skill to invoke next:

- Organic priority -> standard SEO content optimization
- AEO priority -> invoke `absolute-seo` skill for snippet/PAA formatting
- GEO priority -> invoke `absolute-seo` skill for citation optimization
- Dual/tri-surface -> optimize content for primary surface first, then layer secondary

---

## Worked examples

### Example 1: Informational keyword - "how to improve email deliverability"

| Surface | Factor scores | Total |
|---|---|---|
| Organic | Traffic: 2, KD inv: 2, Intent: 1, Gap: 2 = 21/30 | **7** |
| AEO | Snippet: 2, Format: 2, PAA: 2, Voice: 2, Holder: 1 = 18/20 | **9** |
| GEO | Trigger: 2, Citations: 2, Query: 2, Entity: 1, Unique: 1 = 16/20 | **8** |

Composite: 24/30. Priority surface: AEO (highest score, clear snippet opportunity).
Action: create a step-by-step guide formatted to win the featured snippet, include PAA subheadings. The strong GEO score means also structuring for AI citation (clear claims, data points, authoritative tone).

### Example 2: Commercial keyword - "best project management software for remote teams"

| Surface | Factor scores | Total |
|---|---|---|
| Organic | Traffic: 3, KD inv: 1, Intent: 2, Gap: 1 = 20/30 | **7** |
| AEO | Snippet: 1, Format: 1, PAA: 2, Voice: 0, Holder: 1 = 10/20 | **5** |
| GEO | Trigger: 3, Citations: 2, Query: 2, Entity: 1, Unique: 1 = 18/20 | **9** |

Composite: 21/30. Priority surface: GEO (AI engines love comparison queries and cite multiple sources).
Action: create a comparison article with unique evaluation criteria and original analysis. Optimize for AI citation by including clear verdict statements, structured data, and original scoring methodology. Also target organic since score is decent.

### Example 3: Transactional keyword - "buy standing desk adjustable"

| Surface | Factor scores | Total |
|---|---|---|
| Organic | Traffic: 2, KD inv: 1, Intent: 2, Gap: 1 = 17/30 | **6** |
| AEO | Snippet: 0, Format: 0, PAA: 0, Voice: 0, Holder: 0 = 0/20 | **0** |
| GEO | Trigger: 0, Citations: 0, Query: 0, Entity: 0, Unique: 0 = 0/20 | **0** |

Composite: 6/30. Priority surface: Organic (only viable surface).
Action: pure product/category page optimization. AEO=0 because transactional queries don't trigger snippets. GEO=0 because AI Overviews don't fire for direct purchase queries. This is a traditional SEO play.

---

## Limitations and caveats

**AI Overview volatility** - Google's AI Overviews are still evolving rapidly. A keyword that triggers an AI Overview today may not trigger one next month, and vice versa. GEO scores should be re-evaluated quarterly. Do not over-invest in GEO optimization for keywords with inconsistent AI Overview behavior.

**Tool immaturity** - As of 2026, no single tool provides reliable automated tri-surface scoring. The rubrics above require manual evaluation for the AEO and GEO components. Tools like Ahrefs and Semrush are beginning to add SERP feature and AI Overview tracking, but the data is not yet comprehensive enough to fully automate scoring.

**Scores are relative, not absolute** - A keyword scoring 8/10 on organic is not "objectively" easy to rank for. It means it scores high relative to the rubric's criteria. Always cross-reference with domain-specific factors (your site's authority, content production capacity, competitive landscape).

**Research, not optimization** - This scoring framework tells you WHERE the opportunity is. It does not tell you HOW to capture it. For execution:

- Organic optimization: standard content SEO best practices
- AEO capture: use the `absolute-seo` skill
- GEO citation: use the `absolute-seo` skill

**Sample size** - When checking AI Overview triggers, test at least 3 times across different days and browsers. AI Overview appearance can vary by session, location, and Google's ongoing experiments.

---

## Spreadsheet template columns

When building a tri-surface scoring spreadsheet, use these columns:

```
keyword | intent | volume | traffic_potential | kd | organic_score | aeo_score | geo_score | composite | weighted_composite | priority_surface | cluster | action
```

Conditional formatting suggestions:

- Green highlight: any surface score >= 7
- Yellow highlight: surface score 4-6
- Red highlight: surface score 0-3
- Bold: priority_surface column
- Sort by: weighted_composite descending
