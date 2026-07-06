# TermUI SEO and GEO Strategy

Date: 2026-06-28. Site: termui.io. Audience: developers searching for a TypeScript terminal-UI framework.

## Position

GEO is the priority surface. The niche is developer how-to and comparison content, which AI answer engines (ChatGPT Search, Perplexity, Google AI Overviews) answer directly. Research confirmed AI answers already cite TermUI for "React for terminal" and "how to build a TUI in TypeScript." Competitors (Ink, Bubble Tea, Textual) win on definition plus adoption proof plus stats, and they skip FAQ schema, comparison tables, and llms.txt. That gap is the opening.

## Done in this pass (commits f0e19d6, 2b9c4ad, 53d3152)

- llms.txt and llms-full.txt now accurate (15 packages, 230 components). The generator pointed at the old src/content path and produced a stale header. Fixed and wired into prebuild, so the GEO files and 65 .md endpoints regenerate from the docs on every build.
- Dynamic sitemap: 297 URLs covering home, catalog, all 230 component pages, and 65 docs. The old static file listed 30.
- Branded OG image via next/og. The openGraph and twitter image arrays were empty.
- Per-page canonical on component and docs pages.
- Per-page structured data: BreadcrumbList plus SoftwareSourceCode on component pages, BreadcrumbList plus TechArticle on docs.

## Keyword clusters (priority order)

Volumes are unavailable for these long-tail dev terms; rank by opportunity for a low-authority site (long-tail and comparison first).

1. Ink alternative / migration. Primary: "Ink alternative". Page: new /compare/ink. Commercial, GEO.
2. How to build a terminal UI in TypeScript. Page: home + a /docs/build-a-tui tutorial. Informational, GEO + AEO.
3. TUI framework comparison. Primary: "Ink vs Textual vs Bubble Tea". Page: new /compare/tui-frameworks. Commercial, GEO.
4. Terminal spinner / ora alternative. Page: /components/spinner. Commercial.
5. CLI progress bar. Page: /components/progress-bar. Commercial.
6. Terminal table component. Page: /components/table. Commercial.
7. Terminal dashboard / ASCII chart. Page: /components/line-chart + a /docs/dashboard guide. Mixed.
8. React for the terminal (no React). Page: home + /docs/jsx-runtime. Informational.
9. CLI framework TypeScript / build TUI in Bun. Page: home + /docs. Commercial.
10. Components catalog (brand/navigational). Page: /components. Defend brand, internal-link hub.

Deprioritize bare head terms (terminal, TUI, CLI): too broad, no intent.

## Pages worth creating (biggest remaining opportunity)

Comparison pages do not exist yet, and AI engines favor them. Build, in order:

- /compare/ink. TermUI vs Ink. The no-React-dependency angle. Highest commercial GEO win.
- /compare/tui-frameworks. A matrix: TermUI vs Ink vs Textual vs Bubble Tea vs blessed. Columns: language, runtime dependency (React vs none), layout engine, theming, license, install. Use a real HTML table, not an image.
- /compare/opentui, /compare/rezi, /compare/blessed. New TS-native rivals now co-cited with TermUI.
- /docs/build-a-tui. End-to-end TypeScript TUI tutorial.
- /docs/migrate-from-ink. Migration guide.
- /docs/faq. A dedicated FAQ page with FAQPage schema (the homepage already has FAQPage JSON-LD; extend it).

## Citable-content formats to add

AI engines cite these formats most. Map each to a place on the site.

- Definitional intro, 40 to 75 words, entity-dense (names, numbers). Lead every overview page and the homepage with "TermUI is a TypeScript framework that ships its own JSX runtime, so you write JSX without React."
- Comparison table as HTML. Homepage section + architecture doc.
- FAQ question-and-answer pairs with FAQPage schema. Homepage + /docs/faq.
- Copy-paste install blocks. Already in llms.txt; mirror on the homepage.
- Stats and social proof. A "Who's using TermUI" section with star count and "230 components, 15 packages." This is Ink's and Bubble Tea's strongest citation asset and TermUI has none.
- Code examples with filename labels. Quick-start and each widget doc.

## Ten answer-shaped questions to answer verbatim

Put these as Q-and-A on the homepage or /docs/faq, each with a one-sentence direct answer.

1. Is there a React alternative for terminal UIs in TypeScript? TermUI ships its own JSX runtime, so you write JSX without a React dependency.
2. What is the difference between TermUI and Ink? Ink depends on React; TermUI has its own JSX runtime, flexbox layout, and TSS theming with zero React and no C extensions.
3. How do I build a CLI UI in TypeScript without React? Run npx create-termui-app my-app; TermUI provides JSX, hooks, and 230 widgets with no React.
4. Does TermUI work on Node.js? Yes; published packages run on Node 18+ with no native C extensions. Bun 1.3+ is only for development.
5. What terminal UI framework has CSS-like theming? TermUI's TSS gives CSS custom-property theming with 12 built-in themes.
6. Can a terminal list render a million rows? TermUI's VirtualList renders 1,000,000+ items at the same frame rate as 10 by drawing only visible rows.
7. What is the best TypeScript TUI library in 2026? TermUI: 15 packages, 230 components, own JSX runtime, flexbox layout, MIT.
8. Does TermUI support animations and reduced motion? Yes; spring animations via @termuijs/motion, with NO_MOTION honored for CI and accessibility.
9. How is TermUI different from Textual or Bubble Tea? Those target Python and Go; TermUI is the TypeScript-native option with a React-like JSX model.
10. Is TermUI free and open source? Yes, MIT-licensed.

## Off-site

- Get TermUI listed on github.com/rothgar/awesome-tuis. AI answers cite that list often.
- Add a "Who's using" list to the GitHub README, matching Ink and Bubble Tea.

## Remaining technical items

- Confirm the .md endpoints return 200 for bots, not a 307 that strips the body.
- Add an og-image fallback PNG for clients that do not render the dynamic route.
- Submit the sitemap to Google Search Console and Bing Webmaster Tools after deploy.

## Sources

Keyword and GEO research used WebSearch across npm-compare, GitHub (Ink, Bubble Tea, blessed-contrib, asciichart), Textual docs, awesome-tuis, and GEO guides (Growthner comparison tables, NextGrowth FAQ citations, Limy llms.txt). Full citations in the research-agent outputs.
