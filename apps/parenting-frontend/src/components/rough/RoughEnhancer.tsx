import { useLayoutEffect } from 'react';
import rough from 'roughjs';
import { roundedRectPath, seedFromString } from './useRoughCanvas.js';

type Visual = {
  stroke: string;
  fill: string | 'transparent';
  text: string;
};

// Class prefix → visual. Order matters: more specific keys first so
// `btn-duo-green-pill` matches `btn-duo-green` and `btn-duo-outline-sm` matches
// `btn-duo-outline`.
const VARIANT_KEYS: ReadonlyArray<readonly [string, Visual]> = [
  ['btn-duo-surface-pill', { stroke: '#D7E5DA', fill: '#FFFFFF', text: '#2F7D6A' }],
  ['btn-duo-violet-pill', { stroke: '#864E29', fill: '#D87749', text: '#FFFFFF' }],
  ['btn-duo-outline', { stroke: '#2F7D6A', fill: 'rgba(47, 125, 106, 0.06)', text: '#2F7D6A' }],
  ['btn-duo-ghost', { stroke: 'transparent', fill: 'transparent', text: '#2F7D6A' }],
  ['btn-duo-gold', { stroke: '#864E29', fill: '#D87749', text: '#FFFFFF' }],
  ['btn-duo-sky', { stroke: '#3A7299', fill: '#4A8AB4', text: '#FFFFFF' }],
  ['btn-duo-blue', { stroke: '#3A7299', fill: '#4A8AB4', text: '#FFFFFF' }],
  ['btn-duo-green', { stroke: '#194038', fill: '#2F7D6A', text: '#FFFFFF' }],
];

function resolveVariant(el: HTMLElement): Visual | null {
  const classes = Array.from(el.classList);
  for (const [key, visual] of VARIANT_KEYS) {
    for (const cls of classes) {
      if (cls === key || cls.startsWith(`${key}-`)) return visual;
    }
  }
  return null;
}

function parseRadius(el: HTMLElement, height: number): number {
  const computed = getComputedStyle(el).borderTopLeftRadius;
  if (!computed) return 12;
  if (computed.endsWith('%')) return height / 2;
  const px = parseFloat(computed);
  if (!isFinite(px)) return 12;
  // Tailwind rounded-full sets a huge value; clamp to half-height for pill shape.
  return Math.min(px, height / 2);
}

function getSeed(el: HTMLElement): number {
  const cached = el.dataset.roughSeed;
  if (cached) return Number(cached);
  const text = (el.textContent ?? '').trim().slice(0, 60);
  const seed = seedFromString(`${el.tagName}|${el.className}|${text}`);
  el.dataset.roughSeed = String(seed);
  return seed;
}

function drawButton(el: HTMLElement, svg: SVGSVGElement, visual: Visual) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const rect = el.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return;
  const inset = 2;
  const w = rect.width - inset * 2;
  const h = rect.height - inset * 2;
  if (w <= 0 || h <= 0) return;
  const r = parseRadius(el, rect.height);
  const d = roundedRectPath(inset, inset, w, h, r);
  const rc = rough.svg(svg);
  svg.appendChild(
    rc.path(d, {
      stroke: visual.stroke,
      strokeWidth: visual.stroke === 'transparent' ? 0 : 2,
      roughness: 1.4,
      fill: visual.fill === 'transparent' ? undefined : visual.fill,
      fillStyle: 'solid',
      seed: getSeed(el),
    }),
  );
}

function enhanceButton(el: HTMLElement) {
  if (el.dataset.roughEnhanced === 'true') return;
  const visual = resolveVariant(el);
  if (!visual) return;
  el.dataset.roughEnhanced = 'true';

  // Strip the original CSS visuals so the sketchy SVG is the only painted layer.
  el.style.background = 'transparent';
  el.style.backgroundImage = 'none';
  el.style.border = 'none';
  el.style.boxShadow = 'none';
  el.style.color = visual.text;
  el.style.textTransform = 'none';
  el.style.letterSpacing = 'normal';
  if (getComputedStyle(el).position === 'static') {
    el.style.position = 'relative';
  }
  // Create an isolated stacking context so the SVG at z-index -1 lands below
  // text nodes (which paint at stacking step 5) without bleeding behind unrelated
  // siblings outside this element.
  el.style.isolation = 'isolate';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.style.inset = '0';
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '-1';
  el.insertBefore(svg, el.firstChild);
  liftChildrenAboveSvg(el, svg);

  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      drawButton(el, svg, visual);
    });
  };
  drawButton(el, svg, visual);
  const ro = new ResizeObserver(schedule);
  ro.observe(el);
}

const BTN_SELECTOR = '[class*="btn-duo-"]';

// Ensures every child (including raw text nodes) paints above the absolute
// SVG. Some browsers, especially with `<button>`, don't always honor a single
// `isolation: isolate` + `z-index: -1` SVG when the host has text children
// with no positioning. Wrapping text in a positioned span is bulletproof.
function liftChildrenAboveSvg(el: HTMLElement, svg: SVGSVGElement) {
  Array.from(el.childNodes).forEach((node) => {
    if (node === svg) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node as Text;
      if (!text.nodeValue || !text.nodeValue.trim()) return;
      const wrap = document.createElement('span');
      wrap.style.position = 'relative';
      wrap.style.zIndex = '1';
      wrap.dataset.roughTextLift = 'true';
      text.parentNode?.insertBefore(wrap, text);
      wrap.appendChild(text);
    } else if (node instanceof HTMLElement || node instanceof SVGElement) {
      const child = node as HTMLElement;
      if (!child.style.position) child.style.position = 'relative';
      if (!child.style.zIndex) child.style.zIndex = '1';
    }
  });
}

// Card enhancement: any rounded container with a visible border that isn't a
// form control, image, button, or tiny chrome element. Tailwind's rounded-*
// scale ramps from sm → md → lg → xl → 2xl → 3xl → full; everything xl+ is
// a card-ish container; rounded-full is matched for pill chips.
const CARD_SELECTOR = [
  '.duo-skill-card',
  '[class*="rounded-2xl"]',
  '[class*="rounded-3xl"]',
  '[class*="rounded-xl"]',
  '[class*="rounded-lg"]',
  '[class*="rounded-md"]',
  '[class*="rounded-full"]',
].join(', ');
const CARD_TAG_BLOCKLIST = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'IMG', 'PICTURE', 'VIDEO']);
const CARD_MIN_WIDTH = 36;
const CARD_MIN_HEIGHT = 18;

function parseRgb(s: string): { r: number; g: number; b: number; a: number } | null {
  const m = /rgba?\(([^)]+)\)/i.exec(s);
  if (!m) return null;
  const parts = m[1].split(',').map((p) => parseFloat(p.trim()));
  if (parts.length < 3) return null;
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length === 4 ? parts[3] : 1 };
}

function isCardLike(el: HTMLElement): boolean {
  if (CARD_TAG_BLOCKLIST.has(el.tagName)) return false;
  if (el.matches?.(BTN_SELECTOR)) return false;
  if (el.dataset.roughSkip === 'true') return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < CARD_MIN_WIDTH || rect.height < CARD_MIN_HEIGHT) return false;
  const cs = getComputedStyle(el);
  const borderWidth = parseFloat(cs.borderTopWidth) || 0;
  // No border? Still sketchify if the element has a visible background fill
  // (filled chips, gradient panels, etc).
  if (borderWidth < 0.5) {
    const bg = parseRgb(cs.backgroundColor);
    if (!bg || bg.a < 0.05) return false;
    const bgImage = cs.backgroundImage;
    if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) return false;
  }
  return true;
}

type CardVisual = { stroke: string; fill: string; fillStyle: 'solid' };

// Read border/background colors BEFORE we strip them. Falls back to using the
// fill color as the stroke when there's no real border, so e.g. a bare
// `rounded-xl bg-brand-blue` button gets a clean blue sketch instead of a
// phantom outline coming from the user-agent default border-color.
function snapshotCardVisual(el: HTMLElement): CardVisual {
  const cs = getComputedStyle(el);
  const borderWidth = parseFloat(cs.borderTopWidth) || 0;
  const parsedBorder = parseRgb(cs.borderTopColor);
  const parsedBg = parseRgb(cs.backgroundColor);
  const hasRealBorder = borderWidth >= 0.5 && parsedBorder && parsedBorder.a > 0.05;

  let fill = 'transparent';
  if (parsedBg && parsedBg.a > 0.05) {
    fill = `rgba(${parsedBg.r}, ${parsedBg.g}, ${parsedBg.b}, ${parsedBg.a})`;
  }

  let stroke: string;
  if (hasRealBorder && parsedBorder) {
    stroke = `rgb(${parsedBorder.r}, ${parsedBorder.g}, ${parsedBorder.b})`;
  } else if (fill !== 'transparent') {
    stroke = fill;
  } else {
    stroke = '#D7E5DA';
  }

  return { stroke, fill, fillStyle: 'solid' };
}

function drawCard(el: HTMLElement, svg: SVGSVGElement, visual: CardVisual) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const rect = el.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return;
  const cs = getComputedStyle(el);
  const radiusPx = parseFloat(cs.borderTopLeftRadius) || 16;
  const inset = 2;
  const w = rect.width - inset * 2;
  const h = rect.height - inset * 2;
  if (w <= 0 || h <= 0) return;
  const r = Math.min(radiusPx, w / 2, h / 2);
  const d = roundedRectPath(inset, inset, w, h, r);
  const rc = rough.svg(svg);
  svg.appendChild(
    rc.path(d, {
      stroke: visual.stroke,
      strokeWidth: 1.8,
      roughness: 1.6,
      fill: visual.fill === 'transparent' ? undefined : visual.fill,
      fillStyle: visual.fillStyle,
      seed: getSeed(el),
    }),
  );
}

function enhanceCard(el: HTMLElement) {
  if (el.dataset.roughEnhanced === 'true') return;
  if (!isCardLike(el)) return;
  el.dataset.roughEnhanced = 'card';

  // Capture original colors before mutating the element's styles.
  const visual = snapshotCardVisual(el);

  el.style.background = 'transparent';
  el.style.backgroundImage = 'none';
  el.style.border = 'none';
  el.style.boxShadow = 'none';
  if (getComputedStyle(el).position === 'static') {
    el.style.position = 'relative';
  }
  el.style.isolation = 'isolate';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.style.inset = '0';
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '-1';
  el.insertBefore(svg, el.firstChild);
  liftChildrenAboveSvg(el, svg);

  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      drawCard(el, svg, visual);
    });
  };
  drawCard(el, svg, visual);
  const ro = new ResizeObserver(schedule);
  ro.observe(el);
}

function enhanceAllUnder(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(BTN_SELECTOR).forEach(enhanceButton);
  root.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach(enhanceCard);
}

export const RoughEnhancer = () => {
  useLayoutEffect(() => {
    enhanceAllUnder(document.body);
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.matches?.(BTN_SELECTOR)) enhanceButton(node);
            else if (node.matches?.(CARD_SELECTOR)) enhanceCard(node);
            enhanceAllUnder(node);
          }
        });
        if (m.type === 'attributes' && m.target instanceof HTMLElement) {
          const el = m.target;
          if (el.dataset.roughEnhanced) continue;
          if (el.matches?.(BTN_SELECTOR)) enhanceButton(el);
          else if (el.matches?.(CARD_SELECTOR)) enhanceCard(el);
        }
      }
    });
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => mo.disconnect();
  }, []);
  return null;
};
