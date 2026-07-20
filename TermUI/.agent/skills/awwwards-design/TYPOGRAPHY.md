# Award-Winning Typography

Font choices that elevate designs above the generic. Avoid: Inter, Roboto, Open Sans, Arial, system fonts.

---

## Display Fonts (Headlines)

### Geometric/Modern
- **Clash Display** — Bold geometric, sharp corners (free via Fontshare)
- **Satoshi** — Clean geometric, versatile (free via Fontshare)
- **Cabinet Grotesk** — Strong personality, slight quirks (free via Fontshare)
- **General Sans** — Modern geometric, professional (free via Fontshare)
- **Switzer** — Contemporary geometric (free via Fontshare)

### Expressive/Artistic
- **Monument Extended** — Ultra-wide, dramatic (premium)
- **Neue Machina** — Technical, futuristic (free via Pangram Pangram)
- **PP Mori** — Elegant with character (premium)
- **Right Grotesk** — Bold with soft edges (premium)
- **Aktura** — Art deco meets modern (free via Fontshare)

### Serif Display
- **Fraunces** — Expressive, variable (free via Google)
- **Playfair Display** — Classic editorial (free via Google)
- **Cormorant** — Elegant, high contrast (free via Google)
- **DM Serif Display** — Contemporary serif (free via Google)
- **Bodoni Moda** — Classic Bodoni style (free via Google)

### Variable Fonts (for animation)
- **Recursive** — Mono to sans, casual to linear (free)
- **Fraunces** — Weight, optical size, softness (free)
- **Anybody** — Width and weight (free via Fontshare)
- **Epilogue** — Clean, variable weight (free via Google)

---

## Body Fonts

### Sans-Serif
- **Plus Jakarta Sans** — Modern, geometric, readable (free via Google)
- **Outfit** — Contemporary, clean (free via Google)
- **Sora** — Geometric, technical feel (free via Google)
- **Manrope** — Semi-condensed, modern (free via Google)
- **DM Sans** — Geometric, low contrast (free via Google)

### Serif
- **Source Serif 4** — Professional, readable (free via Google)
- **Libre Baskerville** — Classic, elegant (free via Google)
- **Spectral** — Screen-optimized serif (free via Google)
- **Lora** — Contemporary serif (free via Google)

### Monospace
- **JetBrains Mono** — Developer favorite (free)
- **Fira Code** — With ligatures (free)
- **IBM Plex Mono** — Clean, professional (free)
- **Space Mono** — Quirky, editorial (free via Google)

---

## Font Pairing Examples

### Tech/Startup
```
Display: Clash Display (bold)
Body: Plus Jakarta Sans (regular)
Accent: JetBrains Mono (code/details)
```

### Editorial/Magazine
```
Display: Fraunces (variable)
Body: Source Serif 4
Accent: Space Mono
```

### Agency/Creative
```
Display: Monument Extended or Neue Machina
Body: Satoshi or General Sans
Accent: IBM Plex Mono
```

### Luxury/Premium
```
Display: PP Mori or Cormorant
Body: Plus Jakarta Sans (light)
Accent: JetBrains Mono (sparse)
```

### Playful/Bold
```
Display: Cabinet Grotesk (bold)
Body: Outfit
Accent: Space Mono
```

---

## Typography Scale

Award-winning sites often use extreme scales:

```css
:root {
  /* Fluid type scale */
  --text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
  --text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --text-lg: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
  --text-xl: clamp(1.25rem, 1rem + 1.25vw, 1.5rem);
  --text-2xl: clamp(1.5rem, 1rem + 2.5vw, 2rem);
  --text-3xl: clamp(1.875rem, 1rem + 4.375vw, 3rem);
  --text-4xl: clamp(2.25rem, 1rem + 6.25vw, 4rem);
  
  /* Hero sizes (extreme) */
  --text-hero: clamp(3rem, 2rem + 10vw, 12rem);
  --text-mega: clamp(4rem, 2rem + 15vw, 20rem);
}

/* Usage */
.hero-title {
  font-size: var(--text-hero);
  line-height: 0.9;
  letter-spacing: -0.03em;
}
```

---

## Advanced Typography CSS

```css
/* Optical sizing for variable fonts */
.display-text {
  font-optical-sizing: auto;
}

/* Fine typography control */
.refined-text {
  font-feature-settings: 
    "kern" 1,      /* Kerning */
    "liga" 1,      /* Ligatures */
    "calt" 1,      /* Contextual alternates */
    "ss01" 1;      /* Stylistic set 1 */
  
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Tight headlines */
.headline {
  letter-spacing: -0.02em;
  line-height: 1;
  text-wrap: balance;
}

/* Comfortable body */
.body {
  letter-spacing: 0.01em;
  line-height: 1.6;
  max-width: 65ch;
}

/* All caps with tracking */
.overline {
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-size: var(--text-xs);
  font-weight: 500;
}
```

---

## Font Loading Strategy

```html
<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/ClashDisplay-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/PlusJakartaSans-Regular.woff2" as="font" type="font/woff2" crossorigin>

<style>
/* Font-face with display swap */
@font-face {
  font-family: 'Clash Display';
  src: url('/fonts/ClashDisplay-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

/* Fallback stack */
:root {
  --font-display: 'Clash Display', 'Arial Black', sans-serif;
  --font-body: 'Plus Jakarta Sans', 'Helvetica Neue', sans-serif;
  --font-mono: 'JetBrains Mono', 'Consolas', monospace;
}
</style>
```

---

## Free Font Sources

- **Google Fonts**: fonts.google.com
- **Fontshare**: fontshare.com (high quality, free)
- **Font Squirrel**: fontsquirrel.com
- **Pangram Pangram**: pangrampangram.com (some free)
- **The League of Moveable Type**: theleagueofmoveabletype.com
- **Fontesk**: fontesk.com