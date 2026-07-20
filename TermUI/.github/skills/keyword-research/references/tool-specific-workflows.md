<!-- Part of the keyword-research AbsolutelySkilled skill. Load this file when
     performing keyword research using specific SEO tools, or when building a
     tri-surface scoring spreadsheet. -->

# Tool-Specific Keyword Research Workflows

This reference provides step-by-step workflows for performing tri-surface keyword
research using popular SEO tools and free alternatives. Each workflow produces the
data needed to score keywords across organic, AEO (answer engine), and GEO (AI
search) surfaces.

---

## Ahrefs workflow

Ahrefs is best for traffic potential estimates, keyword difficulty, and SERP feature analysis.

### Step 1: Seed keyword expansion (Keywords Explorer)

1. Enter your seed keyword(s) in Keywords Explorer
2. Go to "Matching terms" for direct variants and "Related terms" for semantic expansions
3. Apply filters:
   - Volume: set minimum based on your niche (usually 50+ for B2B, 200+ for B2C)
   - KD: filter to your site's realistic range (new sites: 0-30; established: 0-60)
   - SERP features: check the "SERP features" column - note which keywords trigger featured snippets, PAA, and AI Overviews
4. Export the filtered list (include columns: keyword, volume, KD, traffic potential, SERP features)

### Step 2: Competitor gap analysis (Content Gap)

1. Go to Content Gap tool
2. Enter 3-5 competitor domains in "Show keywords that the following rank for"
3. Enter your domain in "But the following target doesn't rank for"
4. Filter results:
   - Positions: 1-20 for competitors
   - Intersect: at least 2 of the competitors rank (validates the keyword)
5. Export and merge with your seed expansion list
6. In the export, note the SERP features column for each keyword - this feeds AEO scoring

### Step 3: SERP feature audit for AEO scoring

1. For your top 50-100 priority keywords, click into each keyword's SERP Overview
2. Record in your spreadsheet:
   - Featured snippet present? (yes/no) and format (paragraph/list/table)
   - Who holds the snippet? (domain + DR)
   - PAA count (number of People Also Ask boxes)
   - Video carousel present?
3. These data points feed directly into the AEO Opportunity Score rubric

### Step 4: AI Overview check for GEO scoring

Ahrefs has begun tracking AI Overview presence in SERP features (as of 2025). Check the "AI Overview" filter in Keywords Explorer. For keywords where Ahrefs shows AI Overview data:
1. Note whether AI Overview is present
2. For critical keywords, manually verify on Google (Ahrefs data may lag)
3. Record in your spreadsheet for GEO scoring

---

## Semrush workflow

Semrush excels at keyword clustering, intent classification, and SERP feature filtering.

### Step 1: Seed expansion (Keyword Magic Tool)

1. Enter seed keyword in Keyword Magic Tool
2. Use the topic groups on the left sidebar to explore sub-topics
3. Apply filters:
   - Volume: minimum threshold for your niche
   - KD%: realistic range for your domain
   - Intent: Semrush auto-classifies intent (I, N, T, C) - use this as a starting point
   - SERP features: filter by "Featured snippet", "People Also Ask", "AI Overview"
4. Export with all columns including intent and SERP features

### Step 2: Competitor gap (Keyword Gap)

1. Go to Keyword Gap tool
2. Enter your domain vs 3-4 competitors
3. Select "Missing" tab (keywords competitors rank for but you don't)
4. Apply intent filter to focus on your target intent types
5. Sort by traffic potential or volume
6. Export and merge with seed expansion data

### Step 3: SERP feature analysis

1. In the exported data, Semrush includes SERP feature indicators
2. Filter for keywords with featured snippets - these are your AEO candidates
3. Filter for keywords with "AI Overview" - these are your GEO candidates
4. For keywords with both, you have dual-surface opportunity
5. Cross-reference with the tri-surface scoring rubric

### Step 4: Intent validation

Semrush's auto-intent is a good starting point but not always correct:
1. Spot-check 10-15% of your list against live SERPs
2. For any keyword where Semrush says "informational" but the SERP shows product pages, override the classification
3. Pay special attention to keywords Semrush marks as "commercial investigation" - these often have the highest AEO and GEO opportunity

---

## Google Search Console + free tools workflow

For teams without paid tool access, this workflow uses GSC and free resources.

### Step 1: Mine existing rankings (Google Search Console)

1. Go to GSC > Performance > Search results
2. Set date range to last 3 months
3. Export all queries with impressions > 10
4. Sort by impressions descending - these are keywords Google already associates with your site
5. Identify "striking distance" keywords: position 5-20 with decent impressions
   - These are your fastest organic wins
6. Add columns for intent classification (manual, using modifier rules from search-intent-mapping.md)

### Step 2: Expand with free tools

**Google Autocomplete:**
1. Type your seed keyword into Google search
2. Note all autocomplete suggestions
3. Add a letter after the seed ("seed keyword a", "seed keyword b"...) for more suggestions
4. Record all unique suggestions

**People Also Ask mining:**
1. Search your seed keyword on Google
2. Click on PAA questions to expand them (this loads more questions)
3. Record all PAA questions - each is a potential keyword with high AEO value
4. PAA questions are inherently snippet-eligible, so they score high on AEO

**AlsoAsked.com:**
1. Enter your seed keyword
2. Export the question tree (shows how PAA questions branch from each other)
3. Use the question tree to build your keyword cluster hierarchy

**Google Trends:**
1. Compare seed keyword variants to see which has higher/growing interest
2. Check "Related queries" for rising terms (potential emerging opportunities)
3. Use trend data to break ties between similar keywords

### Step 3: Manual SERP audit for AEO/GEO scoring

Without paid tools, you must manually check SERPs for AEO and GEO signals:

1. For your top 30-50 keywords, search each one in an incognito browser
2. For each keyword, record:
   - Featured snippet? Format? Holder domain?
   - PAA count?
   - AI Overview present? How many sources cited?
3. Also test on ChatGPT Search (chat.openai.com with search enabled) and Perplexity (perplexity.ai):
   - Does the query trigger a detailed answer?
   - How many sources are cited?
   - What types of sources are cited? (blogs, official docs, news, forums)
4. Record all data in your scoring spreadsheet

---

## ChatGPT Search and Perplexity manual audit

This audit is essential for GEO scoring and should be performed monthly for priority keywords.

### ChatGPT Search audit

1. Open ChatGPT with search enabled
2. Enter your keyword as a search query
3. Record:
   - Does it generate a search-augmented response? (some queries don't trigger search)
   - How many source citations appear?
   - What domains are cited? (note domain authority/type)
   - What content format do cited sources use? (list, how-to, data-rich, comparison)
   - Is your site cited? If not, which competitor is?

### Perplexity audit

1. Open Perplexity.ai
2. Enter the same keyword
3. Record the same data points as ChatGPT Search
4. Perplexity tends to cite more sources per answer - note the full citation list
5. Compare which sources appear in both ChatGPT Search and Perplexity - consistent citations indicate strong GEO positioning

### Monthly cadence

- Audit your top 20-30 priority keywords monthly
- Track citation changes over time (are you gaining or losing citations?)
- New keywords entering your pipeline should get a one-time audit before scoring
- Quarterly: re-audit your full keyword list (top 100) for GEO score updates

---

## Spreadsheet scoring template

Use this column layout for your tri-surface keyword research spreadsheet:

### Required columns

```
A: keyword
B: intent (informational / navigational / transactional / commercial)
C: search_volume (monthly)
D: traffic_potential (estimated total traffic for ranking page)
E: keyword_difficulty (0-100)
F: cluster_name
G: snippet_present (yes / no / n/a)
H: snippet_format (paragraph / list / table / n/a)
I: snippet_holder_domain
J: paa_count (0, 1-3, 4+)
K: ai_overview_present (yes / sometimes / no)
L: ai_overview_citation_count (number)
M: organic_score (0-10, calculated)
N: aeo_score (0-10, calculated)
O: geo_score (0-10, calculated)
P: composite_score (M + N + O)
Q: weighted_composite (with business goal weights applied)
R: priority_surface (organic / aeo / geo / dual / tri)
S: action (new page / optimize existing / FAQ / deprioritize)
```

### Formulas (Google Sheets / Excel)

**Organic Score (simplified):**
```
=ROUND((MIN(D2/700,3)*3 + (3-MIN(ROUND(E2/23),3))*3 + IF(B2="transactional",2,IF(B2="commercial",2,IF(B2="informational",1,0.5)))*2) / 3, 0)
```

**AEO Score (simplified):**
```
=IF(B2="navigational",0, ROUND((IF(G2="yes",IF(I2="",2,1),IF(B2="informational",2,0))*2 + IF(G2="n/a",0,2)*2 + IF(J2="4+",2,IF(J2="1-3",1,0))*2) / 2, 0))
```

**GEO Score (simplified):**
```
=IF(K2="no",0, ROUND((IF(K2="yes",3,IF(K2="sometimes",1,0))*3 + MIN(L2,2)*2 + IF(B2="informational",2,IF(B2="commercial",2,1))*2) / 2, 0))
```

Note: these formulas are approximations of the full rubric. For the most accurate scores, evaluate each factor individually using the rubric in `references/tri-surface-scoring.md`.

### Conditional formatting

- **Green fill** (score >= 7): high opportunity on this surface
- **Yellow fill** (score 4-6): moderate opportunity
- **Red fill** (score 0-3): low or no opportunity
- **Bold text** in priority_surface column
- **Sort** by weighted_composite descending to see your best opportunities first

### Pivot table suggestions

- Pivot by cluster_name to see aggregate opportunity per topic cluster
- Pivot by priority_surface to see the distribution of organic vs AEO vs GEO opportunities
- Pivot by intent to see which intent type has the most tri-surface opportunity
