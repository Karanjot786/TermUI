<!-- Part of the keyword-research AbsolutelySkilled skill. Load this file when
     building keyword clusters, planning topic architecture, or deciding how many
     pages to create from a keyword list. -->

# Keyword Clustering

Keyword clustering is the process of grouping related keywords so that a single
page can rank for all of them, rather than creating separate thin pages for each
term. It is the bridge between raw keyword research and a content architecture.
Without clustering, a site accumulates redundant, competing pages. With clustering,
every page is built to own a topic - ranking for dozens or hundreds of related terms
while building concentrated topical authority.

---

## Why clustering matters

Search engines rank pages, not keywords. A well-optimized page targeting a primary
keyword will naturally rank for dozens of semantically related variants. Building
separate pages for "project management software" and "project management tools" and
"project management app" splits the backlinks, internal links, and topical signals
that should all feed into one authoritative page.

Benefits of proper clustering:
- Reduces the total number of pages needed (quality over quantity)
- Consolidates link equity to fewer, stronger pages
- Prevents cannibalization before it starts
- Maps clearly to a content calendar (one cluster = one content item)
- Creates a hierarchy that supports pillar-and-spoke internal linking

---

## Clustering methods

### Method 1: SERP-based clustering (most accurate)

Group keywords based on which URLs appear in their top search results. If two
keywords return the same ranking URLs, Google considers them the same topic.

**How to do it:**
1. For each keyword in your list, record the top 5-10 ranking URLs.
2. Compare URL overlap across keywords. Use a clustering tool (Keyword Insights,
   Surfer SEO, KeyClusters) or do it manually for smaller lists.
3. Keywords sharing 3+ of the same top-5 URLs belong in the same cluster.
4. Keywords with 0-1 URL overlap belong in different clusters (or need their own page).

**Threshold guidance:**
- Same 3+ of top 5 URLs: same cluster (high confidence)
- Same 2 of top 5 URLs: likely same cluster (verify manually)
- Same 1 of top 5 URLs: borderline (check if topically related)
- 0 shared URLs: separate clusters

**Advantages:** Most accurate method because it reflects actual Google behavior, not
just keyword similarity. Catches non-obvious clusters where synonyms rank together.

**Disadvantages:** Time-intensive at scale without tooling; requires live SERP data.

---

### Method 2: Semantic/lexical clustering

Group keywords by shared words, stems, and synonyms using linguistic similarity.
Faster than SERP-based clustering, appropriate for early-stage research or lists
where you can not pull SERP data.

**Approaches:**

**Exact match grouping** - Keywords containing the same root phrase go together:
- "email marketing" + "email marketing tools" + "email marketing tips" = one cluster

**Modifier stripping** - Remove modifiers and group by the core concept:
- "best CRM for small business" + "top CRM tools" + "CRM software for startups"
  all strip to "CRM" -> same cluster

**Synonym mapping** - Identify synonyms and near-synonyms that mean the same thing:
- "project management software" / "task management tool" / "work management platform"
  are often synonymous; verify with SERP overlap

**Advantages:** Fast, works without tool access, good for brainstorming.

**Disadvantages:** Less accurate than SERP-based. Can over-cluster (merging keywords
that Google treats as different) or under-cluster (splitting keywords that Google
treats the same).

---

### Method 3: Modifier-based clustering

Group keywords by the type of modifier that qualifies the seed keyword. Useful for
mapping the content types needed across a topic.

**Modifier categories:**

| Modifier type | Examples | Content type |
|---|---|---|
| Question modifiers | "how to X", "what is X", "why X" | How-to guide, explainer |
| Comparison modifiers | "X vs Y", "X alternative", "X compared to Y" | Comparison/versus page |
| Audience modifiers | "X for small business", "X for developers" | Use-case landing page |
| Feature modifiers | "X with API", "X free plan", "X enterprise" | Feature/plan pages |
| Location modifiers | "X in NYC", "X near me" | Local landing page |
| Stage modifiers | "X tutorial", "X examples", "X best practices" | Educational content |

Apply this method after semantic clustering to identify which clusters need sub-pages
(a large cluster with many modifier types may split into a pillar + spoke pages).

---

## Building pillar-and-spoke topic clusters

The pillar-and-spoke model is the standard architecture for topical authority.

**Pillar page:**
- Covers the broadest, highest-volume keyword in the cluster
- Provides a comprehensive overview of the topic
- Links out to each spoke page for deep dives
- Typically 2,000-5,000 words; comprehensive but not exhaustive
- Targets commercial investigation or informational intent at the category level
- Example: "Email Marketing: The Complete Guide"

**Spoke pages:**
- Each covers one sub-topic of the pillar in depth
- Targets a more specific, often long-tail keyword cluster
- Links back to the pillar page
- Typically 1,000-3,000 words; thorough on the specific sub-topic
- Examples: "Email Marketing Automation", "Email Marketing A/B Testing",
  "Email Marketing for E-commerce"

**Hub page (optional):**
- A topical hub is a navigation-oriented page listing pillar pages in a domain
- Useful for large sites covering multiple pillars under one umbrella topic
- Example: a "Marketing Resources" hub linking to pillars on Email, SEO, Social

**Internal linking rules:**
- Every spoke links to its pillar (reinforces pillar authority)
- Pillar links to all spokes (signals topical depth)
- Spokes can link to related spokes within the same pillar
- Never link from a pillar to a page on a different pillar without purpose

---

## Cluster size guidelines

| Cluster size | What it means | Action |
|---|---|---|
| 1-3 keywords | Small, specific cluster | One targeted page; may be a spoke |
| 4-15 keywords | Standard cluster | One well-optimized page targeting all terms |
| 16-40 keywords | Large cluster | Consider splitting into pillar + 2-3 spokes |
| 40+ keywords | Very large cluster | Definitely needs pillar + spoke architecture |

**Signs you are over-clustering** (merged too much):
- Your page would need to cover 5+ distinct sub-topics to address all keywords
- The keywords span multiple intent types (informational + transactional in one cluster)
- The top SERP results for different keywords in the cluster are completely different pages

**Signs you are under-clustering** (split too much):
- You have two planned pages where the top SERP results are 70%+ the same URLs
- Your pages would be shorter than 600 words to cover the "separate" topics
- Your planned pages are semantic synonyms of each other

---

## Manual clustering process (no tooling)

For lists under 100 keywords, manual clustering is practical:

1. **Export to a spreadsheet** - One keyword per row, with search volume and intent.
2. **Sort by root word** - Alphabetical sort often groups related keywords together.
3. **Create a "cluster" column** - Assign a cluster name to each keyword.
4. **Merge by SERP spot-check** - For any two clusters you are unsure about, search
   both keywords and compare the top 3 results. Same URLs? Merge the clusters.
5. **Name each cluster** - Use the highest-volume keyword as the cluster name.
6. **Count keywords per cluster** - Any cluster with 15+ keywords may need a pillar/spoke split.
7. **Assign content type** - Based on intent and cluster size, assign: new page, existing
   page to optimize, FAQ addition, or pillar + spokes.

---

## Tooling options

| Tool | Method | Best for |
|---|---|---|
| Keyword Insights | SERP-based + NLP | Large lists (1,000+); automated clustering |
| Surfer SEO | SERP-based | Clusters tied to content editor workflow |
| KeyClusters | SERP-based | Standalone clustering at low cost |
| Ahrefs / Semrush | Semantic (built-in grouping) | Quick grouping during research; less precise |
| Screaming Frog + custom script | Custom SERP scrape | Technical teams building their own workflows |
| Manual spreadsheet | Semantic + modifier | Lists under 100 keywords |

**No-tool fallback:** For any cluster where you are unsure, search both keywords in
the same incognito browser and compare the top 5 results. If 3 or more results match,
they are the same cluster.

---

## Cluster validation checklist

Before finalizing a cluster and briefing a writer:

- [ ] Primary keyword identified (highest traffic potential in the cluster)
- [ ] All secondary keywords can be naturally addressed in one piece of content
- [ ] SERP-verified: top results for primary keyword match the content type you plan
- [ ] No existing page on your site already owns this cluster (check for cannibalization)
- [ ] Intent is consistent across all keywords in the cluster
- [ ] Cluster size is appropriate (4-15 keywords for a standard page; larger = pillar)
- [ ] Internal links planned: this page links to its pillar; pillar links back

A validated cluster becomes a one-to-one mapping to a content brief. One cluster =
one content item = one calendar slot. This is the link between keyword research and
content execution.

---

## Surface-aware clustering

In tri-surface keyword research, clusters should be annotated with their dominant
surface opportunity. This annotation tells content creators not just what to write
about but which surface to optimize for first.

### How to annotate clusters with a dominant surface

After building your clusters using any of the methods above, add a surface annotation
step:

1. **Score each keyword in the cluster** using the tri-surface scoring rubric from
   `references/tri-surface-scoring.md`. You need organic, AEO, and GEO scores per keyword.

2. **Average the scores across the cluster** to get cluster-level surface scores:
   - Cluster organic score = average of all keywords' organic scores
   - Cluster AEO score = average of all keywords' AEO scores
   - Cluster GEO score = average of all keywords' GEO scores

3. **Assign the dominant surface** based on the highest cluster-level score. If two
   scores are within 1 point, mark it as a dual-surface cluster.

4. **Add the surface label to the cluster name:**
   - "email marketing automation [ORG]" - organic-dominant
   - "how to improve email deliverability [AEO]" - AEO-dominant (snippet opportunity)
   - "best email marketing tools for startups [GEO]" - GEO-dominant (AI citation opportunity)
   - "email marketing vs SMS marketing [AEO+GEO]" - dual-surface

### Surface patterns by cluster type

Certain cluster shapes naturally align with specific surfaces:

| Cluster type | Dominant surface | Why |
|---|---|---|
| Question clusters ("how to X", "what is X", "why X") | AEO | Question queries trigger featured snippets and PAA boxes at high rates. Voice search also favors question-format content. |
| Comparison clusters ("X vs Y", "best X for Y", "X alternatives") | GEO | AI engines produce detailed comparison answers with multiple citations. These are the highest-value GEO clusters. |
| Data-rich clusters ("X statistics", "X benchmarks", "X report") | GEO | AI engines cite sources with original data and statistics. If your content has proprietary data, GEO opportunity is high. |
| Transactional clusters ("buy X", "X pricing", "X free trial") | Organic | Neither snippets nor AI Overviews fire for purchase-intent queries. Pure organic play. |
| Tutorial clusters ("X tutorial", "X step by step", "X for beginners") | AEO + Organic | Step-by-step content wins list snippets and ranks well organically. Some GEO opportunity if the tutorial is comprehensive. |
| Definition clusters ("what is X", "X definition", "X explained") | AEO | Paragraph snippets fire for definition queries. AI engines answer these from training data with fewer citations, so GEO is lower. |

### Impact on content brief

The dominant surface annotation changes the content brief requirements:

- **Organic-dominant clusters**: standard SEO brief - focus on depth, internal linking,
  keyword placement, and matching the SERP content type
- **AEO-dominant clusters**: brief must include snippet-formatted answer blocks,
  PAA subheadings, concise answer paragraphs (40-60 words), and structured lists/tables.
  Reference the `absolute-seo` skill for formatting details.
- **GEO-dominant clusters**: brief must include citable claims with supporting data,
  clear expert positioning, unique analysis or original research, and structured
  content that AI engines can extract. Reference the `absolute-seo` skill for
  citation optimization details.
- **Dual/tri-surface clusters**: layer the requirements - lead with the primary surface
  format, then address secondary surface needs in supporting sections
