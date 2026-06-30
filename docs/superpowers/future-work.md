# Future Work (Deferred)

Items not built yet. Do later. Not in the original roadmap priority plan, or
deprioritized. Captured here so we do not forget.

## 1. Sponsor page

A `/sponsor` route. Tiers plus a GitHub stargazers / backers list. termcn has
one. Low priority until there is a funding ask.

## 2. MCP integration (helps GEO, worth doing)

`/.well-known/agent-skills` plus an OpenAPI spec, like termcn. This exposes the
site to AI agents and MCP clients for discovery, which strengthens GEO. Highest
value of the four. Pairs with the existing llms.txt and .md endpoints.

## 3. Command menu (Cmd+K)

A keyboard-driven command palette for fast navigation across docs and the 230
component pages. Dogfood: build it with the TermUI CommandPalette idea, or a web
cmdk. Improves docs UX.

## 4. Sound + haptics on clicks

Audio cue plus web-haptics on button clicks, user-togglable. termcn ships this.
Pure polish, lowest priority.

## Also open (inside the original plan)

- Docs full-text search. The one part of Fumadocs integration not wired. No
  Orama search route yet; docs resolve via a hand-maintained map in
  `website/src/lib/source.ts`.
- A few MDX docs may still use raw HTML `<table>` instead of markdown pipe
  tables. Minor.

## Reference

- Roadmap: `docs/termcn-analysis-and-roadmap.md`
- SEO/GEO plan: `docs/seo-geo-strategy-2026-06-28.md`
- Brand: `docs/superpowers/brand.md`
