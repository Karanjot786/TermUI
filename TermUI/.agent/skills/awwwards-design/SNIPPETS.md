# Awwwards Design — Code Snippets

Ready-to-use code patterns for award-winning interactions.

---

## Smooth Scroll Setup (Lenis)

```html
<script src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js"></script>
<script>
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  smoothWheel: true
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Connect to GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
</script>
```

---

## Staggered Text Reveal

```javascript
// Requires: GSAP, SplitType
import SplitType from 'split-type';

function animateText(selector, options = {}) {
  const defaults = {
    y: 100,
    opacity: 0,
    duration: 0.8,
    stagger: 0.02,
    ease: "power3.out",
    delay: 0
  };
  const config = { ...defaults, ...options };
  
  const split = new SplitType(selector, { types: 'lines, words, chars' });
  
  // Wrap lines for overflow hidden effect
  split.lines.forEach(line => {
    const wrapper = document.createElement('div');
    wrapper.style.overflow = 'hidden';
    line.parentNode.insertBefore(wrapper, line);
    wrapper.appendChild(line);
  });
  
  gsap.from(split.chars, {
    y: config.y,
    opacity: config.opacity,
    duration: config.duration,
    stagger: config.stagger,
    ease: config.ease,
    delay: config.delay,
    scrollTrigger: {
      trigger: selector,
      start: "top 80%"
    }
  });
}

// Usage
animateText('.hero-title', { stagger: 0.03 });
animateText('.subtitle', { delay: 0.5 });
```

---

## Magnetic Button Effect

```javascript
class MagneticButton {
  constructor(el) {
    this.el = el;
    this.strength = 0.5;
    this.boundingRect = null;
    
    this.el.addEventListener('mouseenter', () => this.onEnter());
    this.el.addEventListener('mousemove', (e) => this.onMove(e));
    this.el.addEventListener('mouseleave', () => this.onLeave());
  }
  
  onEnter() {
    this.boundingRect = this.el.getBoundingClientRect();
  }
  
  onMove(e) {
    const { left, top, width, height } = this.boundingRect;
    const x = (e.clientX - left - width / 2) * this.strength;
    const y = (e.clientY - top - height / 2) * this.strength;
    
    gsap.to(this.el, {
      x,
      y,
      duration: 0.3,
      ease: "power2.out"
    });
  }
  
  onLeave() {
    gsap.to(this.el, {
      x: 0,
      y: 0,
      duration: 0.6,
      ease: "elastic.out(1, 0.4)"
    });
  }
}

// Initialize all magnetic elements
document.querySelectorAll('[data-magnetic]').forEach(el => new MagneticButton(el));
```

---

## Custom Cursor with Context States

```html
<style>
.cursor {
  position: fixed;
  width: 20px;
  height: 20px;
  border: 2px solid white;
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  mix-blend-mode: difference;
  transition: transform 0.15s ease, width 0.3s ease, height 0.3s ease;
}

.cursor--hover {
  width: 60px;
  height: 60px;
  border-width: 1px;
}

.cursor--text {
  width: 100px;
  height: 100px;
}

.cursor--text::after {
  content: 'View';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.cursor--hidden {
  opacity: 0;
  transform: scale(0);
}

@media (pointer: coarse) {
  .cursor { display: none; }
}
</style>

<div class="cursor"></div>

<script>
const cursor = document.querySelector('.cursor');
let mouseX = 0, mouseY = 0, cursorX = 0, cursorY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX - 10;
  mouseY = e.clientY - 10;
});

function render() {
  cursorX += (mouseX - cursorX) * 0.15;
  cursorY += (mouseY - cursorY) * 0.15;
  cursor.style.left = cursorX + 'px';
  cursor.style.top = cursorY + 'px';
  requestAnimationFrame(render);
}
render();

// Context states
document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('cursor--hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('cursor--hover'));
});

document.querySelectorAll('[data-cursor="view"]').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('cursor--text'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('cursor--text'));
});
</script>
```

---

## Parallax Image Container

```html
<style>
.parallax-container {
  overflow: hidden;
  position: relative;
}

.parallax-image {
  width: 100%;
  height: 120%; /* Extra height for parallax movement */
  object-fit: cover;
  will-change: transform;
}
</style>

<div class="parallax-container">
  <img src="image.jpg" class="parallax-image" alt="">
</div>

<script>
gsap.registerPlugin(ScrollTrigger);

document.querySelectorAll('.parallax-container').forEach(container => {
  const image = container.querySelector('.parallax-image');
  
  gsap.to(image, {
    y: '-10%',
    ease: 'none',
    scrollTrigger: {
      trigger: container,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true
    }
  });
});
</script>
```

---

## Horizontal Scroll Section

```html
<style>
.horizontal-scroll {
  overflow: hidden;
}

.horizontal-track {
  display: flex;
  width: fit-content;
}

.horizontal-panel {
  width: 100vw;
  height: 100vh;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

<section class="horizontal-scroll">
  <div class="horizontal-track">
    <div class="horizontal-panel">Panel 1</div>
    <div class="horizontal-panel">Panel 2</div>
    <div class="horizontal-panel">Panel 3</div>
    <div class="horizontal-panel">Panel 4</div>
  </div>
</section>

<script>
const track = document.querySelector('.horizontal-track');
const panels = gsap.utils.toArray('.horizontal-panel');

gsap.to(track, {
  x: () => -(track.scrollWidth - window.innerWidth),
  ease: 'none',
  scrollTrigger: {
    trigger: '.horizontal-scroll',
    pin: true,
    scrub: 1,
    end: () => '+=' + track.scrollWidth
  }
});
</script>
```

---

## Page Transition with Barba.js

```javascript
import barba from '@barba/core';
import gsap from 'gsap';

barba.init({
  transitions: [{
    name: 'fade-transition',
    leave(data) {
      return gsap.to(data.current.container, {
        opacity: 0,
        y: -50,
        duration: 0.5,
        ease: 'power2.inOut'
      });
    },
    enter(data) {
      return gsap.from(data.next.container, {
        opacity: 0,
        y: 50,
        duration: 0.5,
        ease: 'power2.out'
      });
    }
  }]
});
```

---

## Reveal Animation on Scroll

```javascript
// Generic reveal system
function initReveals() {
  gsap.registerPlugin(ScrollTrigger);
  
  // Fade up
  gsap.utils.toArray('[data-reveal="fade-up"]').forEach(el => {
    gsap.from(el, {
      y: 60,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%'
      }
    });
  });
  
  // Fade in
  gsap.utils.toArray('[data-reveal="fade"]').forEach(el => {
    gsap.from(el, {
      opacity: 0,
      duration: 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%'
      }
    });
  });
  
  // Stagger children
  gsap.utils.toArray('[data-reveal="stagger"]').forEach(container => {
    const children = container.children;
    gsap.from(children, {
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: container,
        start: 'top 80%'
      }
    });
  });
  
  // Scale in
  gsap.utils.toArray('[data-reveal="scale"]').forEach(el => {
    gsap.from(el, {
      scale: 0.8,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%'
      }
    });
  });
}

// Usage in HTML:
// <div data-reveal="fade-up">...</div>
// <div data-reveal="stagger"><span>1</span><span>2</span><span>3</span></div>
```

---

## Noise/Grain Overlay (CSS)

```css
/* Add to body or a fixed overlay */
.grain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
}

.grain::before {
  content: '';
  position: absolute;
  inset: -100%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.035;
  animation: grain 8s steps(10) infinite;
}

@keyframes grain {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-5%, -10%); }
  20% { transform: translate(-15%, 5%); }
  30% { transform: translate(7%, -25%); }
  40% { transform: translate(-5%, 25%); }
  50% { transform: translate(-15%, 10%); }
  60% { transform: translate(15%, 0%); }
  70% { transform: translate(0%, 15%); }
  80% { transform: translate(3%, 35%); }
  90% { transform: translate(-10%, 10%); }
}
```

---

## Reduced Motion Support

```javascript
// Check for reduced motion preference
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Adjust GSAP defaults
if (prefersReducedMotion) {
  gsap.defaults({
    duration: 0,
    ease: 'none'
  });
  
  // Disable ScrollTrigger scrubbing
  ScrollTrigger.defaults({
    scrub: false
  });
}

// Or conditionally apply animations
function animate(element, props) {
  if (prefersReducedMotion) {
    gsap.set(element, { opacity: 1, y: 0, x: 0, scale: 1 });
    return;
  }
  gsap.from(element, props);
}
```

---

## Loading Sequence

```javascript
// Orchestrated loading animation
function initLoader() {
  const loader = document.querySelector('.loader');
  const counter = document.querySelector('.loader-counter');
  const tl = gsap.timeline();
  
  // Fake loading counter
  let progress = { value: 0 };
  gsap.to(progress, {
    value: 100,
    duration: 2,
    ease: 'power2.inOut',
    onUpdate: () => {
      counter.textContent = Math.round(progress.value) + '%';
    }
  });
  
  // After "loading" completes
  tl.to(loader, {
    yPercent: -100,
    duration: 0.8,
    ease: 'power3.inOut',
    delay: 2.2
  })
  .from('.hero-title', {
    y: 100,
    opacity: 0,
    duration: 1,
    ease: 'power3.out'
  }, '-=0.3')
  .from('.hero-subtitle', {
    y: 50,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out'
  }, '-=0.6')
  .from('.nav', {
    y: -50,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out'
  }, '-=0.4');
}

document.addEventListener('DOMContentLoaded', initLoader);
```