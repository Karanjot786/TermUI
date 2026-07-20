---
name: awwwards-design
description: Create award-winning, memorable websites with advanced animations, creative interactions, and distinctive visual experiences. Use this skill when building sites that need to be exceptional—portfolio sites, agency showcases, product launches, or any project where "wow factor" matters.
license: MIT
---

# Awwwards-Level Web Design

This skill guides creation of truly exceptional websites—the kind that win awards, get shared, and make people stop scrolling. These aren't just good websites; they're experiences.

## Philosophy: What Makes a Site Unforgettable

Award-winning sites share common traits that separate them from the millions of forgettable pages:

### 1. Intentional Storytelling
Every scroll, every click, every hover tells part of a story. The site guides users through a narrative, not just a collection of sections. Content reveals progressively, creating anticipation and reward.

### 2. Choreographed Motion
Animations aren't decoration—they're communication. Each movement has purpose: guiding attention, providing feedback, creating continuity, or building emotional resonance. The timing, easing, and sequencing are meticulously orchestrated.

### 3. Sensory Richness
These sites engage multiple senses. Custom cursors create tactile feedback. Sound design (when appropriate) adds depth. Textures, gradients, and lighting effects create atmosphere. The experience feels *physical* despite being digital.

### 4. Technical Craftsmanship
Smooth 60fps animations. Fast load times despite rich visuals. Graceful degradation on slower devices. The engineering is invisible but essential.

### 5. Breaking Conventions Intentionally
Award-winning sites know the rules well enough to break them deliberately. Unconventional layouts, unexpected interactions, rule-breaking typography—but always in service of the experience, never random.

---

## The Awwwards Evaluation Criteria

Sites are judged on four dimensions:

1. **Design** (8.5+ for SOTD): Visual aesthetics, composition, color, typography, imagery
2. **Usability** (8.5+ for SOTD): Navigation, accessibility, responsiveness, intuitive UX
3. **Creativity** (8.5+ for SOTD): Innovation, uniqueness, memorable moments
4. **Content** (8.5+ for SOTD): Quality, storytelling, relevance, engagement

To win Site of the Day, you need excellence across ALL four. A beautiful site with poor usability won't win.

---

## Core Animation Techniques

### 1. Scroll-Triggered Animations

The foundation of immersive web experiences. Elements animate in response to scroll position, creating a sense of discovery.

**Key Patterns:**
- **Reveal on Enter**: Elements fade/slide/scale into view as they enter the viewport
- **Scrubbed Animations**: Animation progress tied directly to scroll position (not just triggered)
- **Parallax Layers**: Background and foreground elements move at different speeds, creating depth
- **Horizontal Scroll Sections**: Vertical scrolling translates to horizontal movement
- **Pinned Sections**: Elements stay fixed while content scrolls through them

**Implementation Stack:**
```
Primary: GSAP + ScrollTrigger (industry standard)
Smooth Scrolling: Lenis or GSAP ScrollSmoother
React: Framer Motion + useScroll hook
```

**Code Pattern (GSAP):**
```javascript
gsap.registerPlugin(ScrollTrigger);

// Basic reveal
gsap.from(".reveal-element", {
  opacity: 0,
  y: 100,
  duration: 1,
  ease: "power3.out",
  scrollTrigger: {
    trigger: ".reveal-element",
    start: "top 80%",
    end: "top 20%",
    toggleActions: "play none none reverse"
  }
});

// Scrubbed animation (tied to scroll position)
gsap.to(".parallax-bg", {
  y: -200,
  ease: "none",
  scrollTrigger: {
    trigger: ".parallax-section",
    start: "top bottom",
    end: "bottom top",
    scrub: true
  }
});
```

### 2. Text Splitting & Typography Animation

Award-winning sites treat text as a design element, not just content. Individual characters, words, and lines become animatable units.

**Key Patterns:**
- **Character-by-character reveals**: Letters animate in sequentially
- **Word stagger**: Words cascade in with varying delays
- **Line-by-line reveals**: Each line slides or fades independently
- **Scramble/decode effects**: Text appears to decode or unscramble
- **Kinetic typography**: Text that moves, rotates, or transforms with scroll/interaction

**Implementation:**
```
GSAP SplitText (premium but powerful)
SplitType (free alternative)
Splitting.js (lightweight)
```

**Code Pattern:**
```javascript
// Using SplitType + GSAP
const text = new SplitType('.hero-title', { types: 'chars, words' });

gsap.from(text.chars, {
  opacity: 0,
  y: 50,
  rotateX: -90,
  stagger: 0.02,
  duration: 0.8,
  ease: "back.out(1.7)"
});
```

**Typography Choices for Impact:**
- Display fonts with character: Neue Machina, Monument Extended, PP Mori, Clash Display, Satoshi
- Variable fonts for animation: Weight, width, and slant can animate smoothly
- Extreme sizes: Hero text at 15-25vw creates immediate impact
- Mixed weights and sizes within a single headline

### 3. Micro-Interactions & Hover States

The details that create delight. Every interactive element should respond to user input in satisfying ways.

**Key Patterns:**
- **Magnetic buttons**: Elements that pull toward the cursor
- **Reveal on hover**: Hidden content or effects that appear on interaction
- **Morphing shapes**: Elements that transform shape on hover
- **Ripple effects**: Click feedback that radiates from touch point
- **State machines**: Complex multi-state animations (idle → hover → active → complete)

**Implementation:**
```
Rive (for complex state-based animations)
Lottie (After Effects → web)
GSAP (programmatic control)
CSS transitions (simple states)
```

**Code Pattern (Magnetic Effect):**
```javascript
const magneticElements = document.querySelectorAll('.magnetic');

magneticElements.forEach(el => {
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    gsap.to(el, {
      x: x * 0.3,
      y: y * 0.3,
      duration: 0.3,
      ease: "power2.out"
    });
  });
  
  el.addEventListener('mouseleave', () => {
    gsap.to(el, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: "elastic.out(1, 0.3)"
    });
  });
});
```

### 4. Page Transitions

Seamless transitions between pages create a native-app feel and maintain immersion.

**Key Patterns:**
- **Crossfade with motion**: Old page fades while new slides in
- **Shared element transitions**: Images or elements morph between pages
- **Wipe/reveal transitions**: Content sweeps across screen
- **Zoom transitions**: Click target expands to fill screen
- **Overlay transitions**: Colored layer sweeps over before revealing new content

**Implementation:**
```
Barba.js + GSAP (multi-page sites)
Next.js + Framer Motion (React apps)
Astro + View Transitions API (modern approach)
```

### 5. Custom Cursors

Replace the default cursor with something that reinforces the brand and adds interactivity.

**Key Patterns:**
- **Follower cursor**: A shape that follows with slight lag (lerping)
- **Context-aware cursor**: Changes based on what it's hovering
- **Magnetic cursor**: Snaps to interactive elements
- **Blob cursor**: Morphing organic shape
- **Text cursor**: Words that follow the pointer
- **Trail effects**: Multiple elements following in sequence

**Code Pattern:**
```javascript
const cursor = document.querySelector('.cursor');
let mouseX = 0, mouseY = 0;
let cursorX = 0, cursorY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// Smooth following with lerp
function animate() {
  cursorX += (mouseX - cursorX) * 0.1;
  cursorY += (mouseY - cursorY) * 0.1;
  
  cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
  requestAnimationFrame(animate);
}
animate();

// Context changes
document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('cursor--hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('cursor--hover'));
});
```

### 6. Easing & Timing

The secret sauce. Proper easing transforms mechanical movement into organic motion.

**Essential Easing Functions:**
```
power2.out / power3.out — Natural deceleration (most common)
power2.inOut — Smooth acceleration and deceleration
back.out(1.7) — Slight overshoot, then settle (playful)
elastic.out(1, 0.3) — Bouncy, energetic
expo.out — Dramatic fast-start, slow-end
circ.out — Quick initial movement
```

**Timing Principles:**
- **Stagger delays**: 0.02-0.05s between sequential elements
- **Hover transitions**: 0.2-0.4s (fast enough to feel responsive)
- **Page transitions**: 0.6-1.2s (long enough to appreciate, not too slow)
- **Scroll animations**: Duration tied to scroll distance, or 0.8-1.5s for triggered

**The Golden Rule**: Fast in, slow out. Most movements should decelerate into their final position.

---

## Visual Techniques

### Gradients & Color

**Mesh Gradients**: Complex multi-point gradients that feel organic
```css
background: 
  radial-gradient(at 40% 20%, hsla(28,100%,74%,1) 0px, transparent 50%),
  radial-gradient(at 80% 0%, hsla(189,100%,56%,1) 0px, transparent 50%),
  radial-gradient(at 0% 50%, hsla(355,85%,93%,1) 0px, transparent 50%);
```

**Animated Gradients**: Shifting colors that create movement
```css
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.animated-gradient {
  background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
  background-size: 400% 400%;
  animation: gradient-shift 15s ease infinite;
}
```

### Texture & Depth

**Grain/Noise Overlays**: Add organic texture
```css
.grain::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
  z-index: 9999;
}
```

**Glassmorphism**: Frosted glass effects
```css
.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
}
```

**Shadows for Depth**: Layered, soft shadows
```css
.elevated {
  box-shadow: 
    0 1px 1px rgba(0,0,0,0.02),
    0 2px 2px rgba(0,0,0,0.02),
    0 4px 4px rgba(0,0,0,0.02),
    0 8px 8px rgba(0,0,0,0.02),
    0 16px 16px rgba(0,0,0,0.02);
}
```

### Layout Breaking

**Overlapping Elements**: Break the grid intentionally
**Diagonal/Angular Sections**: Clip-path for non-rectangular sections
**Asymmetric Compositions**: Deliberate imbalance creates tension
**Full-bleed Media**: Images/video that escape containers
**Mixed Grid Systems**: Combine different column structures

---

## 3D & WebGL

For truly next-level sites, 3D elements create unforgettable experiences.

**Implementation Stack:**
```
Three.js — Full 3D engine
React Three Fiber — Three.js in React
Spline — No-code 3D design tool
Lottie 3D — Lightweight 3D animations
```

**Common Patterns:**
- 3D product viewers with orbit controls
- Particle systems responding to scroll/mouse
- Shader effects (distortion, ripple, noise)
- 3D text and typography
- Environment scenes with camera movement

**Performance Note**: 3D is expensive. Use sparingly, optimize aggressively, and always provide fallbacks.

---

## Technical Requirements

### Performance Targets
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Total Blocking Time**: < 200ms
- **Animation frame rate**: Consistent 60fps

### Optimization Strategies
- Lazy load below-fold content
- Preload critical assets
- Use `will-change` sparingly and correctly
- Debounce scroll handlers
- Use `requestAnimationFrame` for JS animations
- Prefer CSS transforms over layout-triggering properties
- Compress and optimize all media

### Accessibility
Award-winning sites must be usable by everyone:
- Respect `prefers-reduced-motion`
- Maintain keyboard navigation
- Ensure sufficient color contrast
- Provide text alternatives for visual content
- Test with screen readers

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Implementation Checklist

Before considering a site "award-worthy," verify:

### Animation
- [ ] Scroll-triggered reveals with staggered timing
- [ ] Smooth scroll (Lenis or equivalent)
- [ ] Custom easing on all animations
- [ ] Page/section transitions
- [ ] Hover states on all interactive elements
- [ ] Loading animation/sequence

### Visual
- [ ] Distinctive typography (not Inter/Roboto)
- [ ] Custom cursor (if appropriate)
- [ ] Texture/grain overlay
- [ ] Considered color palette with intention
- [ ] Atmospheric backgrounds (gradients, effects)
- [ ] Consistent visual language throughout

### Technical
- [ ] 60fps animation performance
- [ ] Mobile responsive with adapted interactions
- [ ] Reduced motion support
- [ ] Fast initial load
- [ ] No layout shift during load

### Content
- [ ] Clear narrative/story structure
- [ ] Purposeful content hierarchy
- [ ] Engaging copywriting
- [ ] High-quality imagery/media

---

## Reference Sites

Study these for inspiration (search on Awwwards):
- **Immersive storytelling**: Apple product pages, Stripe
- **Creative agency**: Resn, Active Theory, Locomotive
- **Portfolio**: Bruno Simon, Aristide Benoist, Dennis Snellenberg
- **Product**: Linear, Vercel, Raycast
- **Editorial**: The Pudding, NYT Interactives

---

## When NOT to Use This Approach

Award-winning design isn't always appropriate:
- **E-commerce with conversion goals**: Simplicity often wins
- **Information-heavy sites**: Clarity over creativity
- **Accessibility-first contexts**: Heavy animation can be exclusionary
- **Limited budget/timeline**: This takes significant time to execute well

Use these techniques when the goal is to create a memorable brand experience, showcase creative work, or make a statement. For utility-focused sites, the standard frontend-design skill may be more appropriate.

---

Remember: Award-winning sites aren't just technically impressive—they're emotionally resonant. Every animation, every interaction, every visual choice should serve the story you're telling. Technical skill without creative vision produces impressive-but-forgettable work. The goal is to make someone feel something.