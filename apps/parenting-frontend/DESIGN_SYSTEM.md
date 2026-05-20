# Raised Design System

**Confident Calm (Garden Morning)**: pale-mint canvas, sage-teal primary, warm peach for celebration. Light mode only, no dark variant. Implementation sources of truth: **`tailwind.config.cjs`** for tokens, **`src/index.css`** for `.btn-duo-*` / `.celebrate-*` / motion utilities.

The product voice: an AI assistant for a tired parent on a phone. Calm by default, warm at the edges, gamified only in moments that have earned it. If the screen feels like a kids' app, the palette has drifted; if it feels like a banking app, the warmth has drained.

---

## Clarity-first interaction rules

These rules apply to every screen. Optimize for "a tired parent on a phone gets it in one second."

1. **Every interactive control has a visible text label.** Aria labels are for assistive tech, not a substitute for legible UI. Icon-only buttons (trash, edit, expand chevron, ellipsis) are off-limits unless the user has already proven they understand the context (e.g. inside an already-open editor).
2. **Touch targets are 40px minimum, 48px for primary actions.** Use `min-h-[40px]` or `py-2.5+`. Avoid tiny `h-8 w-8` icon buttons for anything destructive or navigational.
3. **Expand and collapse affordances are explicit.** Either the entire row is the toggle (chevron is decorative), or the trigger reads "Show more" / "Show less". Don't ask the user to spot a small chevron.
4. **Destructive actions always carry the word.** "Delete", "Remove", "Sign out", never a lone trash icon. Pair the word with `bg-error` and require confirmation for irreversible ops.
5. **Edit affordances are labeled too.** Full-width "Edit" button or icon-plus-word. Inline pencil icons alone are too easy to miss.
6. **Active state is unambiguous.** Use both a background tint *and* a labeled badge ("Active"), not just a color shift.
7. **Errors and empty states tell the user what to do next**, with a labeled action ("Add a child", "Invite a partner"), not just descriptive text.

When space is tight, drop visual chrome (cards, borders, padding) before dropping labels.

### Confirmation modals

Any irreversible action (delete account, delete conversation, delete family, remove child, remove member, sign out) routes through a confirmation modal with:

- Title that states what's being deleted in plain language.
- Body that explains the consequence ("This cannot be undone").
- Two labeled buttons: Cancel (neutral) and the destructive verb (`bg-error`).
- 44px minimum height on both buttons.

---

## Color palette (Confident Calm, Garden Morning)

### Canvas & surfaces

| Token | Hex | Usage |
|---|---|---|
| `background` | `#EEF6F0` | App canvas, pale mint paper, also set on `html` + `#root` in `index.css` |
| `surface.DEFAULT` | `#FFFFFF` | Cards, inputs, panels, chat bubbles |
| `surface.light` | `#E3EFE6` | Elevated rows, hover, quoted technique blocks |
| `surface.warm` | `#D2E5D7` | Stronger elevation, decorative bands |

Mint canvas + white surfaces is the load-bearing contrast pair. Never use a pure-white canvas, the depth comes from the tinted paper underneath.

### Brand & roles

| Role | Hex | Tailwind | Used for |
|---|---|---|---|
| **Primary (sage-teal)** | `#2F7D6A` | `primary.500`, `brand.green` | AI brand voice, primary CTAs, success, activities, primary progress |
| **Secondary (warm peach, fill)** | `#D87749` | `secondary.500` | Celebration fills, "Try again" CTA, AA-Large white text |
| **Energy peach (tint / accent)** | `#E89163` | `secondary.400` | Brighter peach for tint backgrounds, icon strokes on light fills |
| **Brand blue (sky)** | `#4A8AB4` | `brand.blue`, `info`, `accent.blue` | User voice in chat, info, calendar, reminders, links |
| **Brand pink (dusty rose)** | `#D88BA0` | `brand.pink` (fg `#6E2940`) | Academy / Practice / appointment category |
| **Brand yellow (honey)** | `#DDA94A` | `brand.yellow` (fg `#6E4E15`) | Honey accent, distinct from peach |
| **Error** | `#C75555` | `error`, `brand.red` | Destructive actions, validation errors, "Didn't work" reflection |
| **Brand purple (faded lilac)** | `#9B7BBE` | `brand.purple`, `gamification.xp` | XP ink in the top-bar stat pill |

Hover pairings: `bg-primary-500` → `hover:bg-primary-600` (`#225A4E`), `bg-brand-blue` → `hover:bg-accent-blueHover` (`#3A7299`), `bg-error` → `hover:brightness-95`.

#### Tints & foregrounds (the `-50` / `-100` / `-fg` family)

Pastel tints live on white/mint surfaces with dark `*-fg` text. The `-500` saturated fills carry white text, validated for WCAG AA-Large at body size; primary CTAs are large enough to qualify.

| Tint | Hex | Pair with |
|---|---|---|
| `primary-50` | `rgba(47,125,106,0.06)` | `text-primary-fg` (`#16332C`) |
| `primary-100` | `rgba(47,125,106,0.14)` | `text-primary-fg` |
| `primary-200` | `rgba(47,125,106,0.22)` | borders + icon bubbles |
| `secondary-50` | `rgba(232,145,99,0.10)` | `text-secondary-fg` (`#5C3211`) |
| `secondary-100` | `rgba(232,145,99,0.22)` | `text-secondary-fg`, XP badge |
| `error/10` / `error/15` | tinted via `/opacity` | `text-error` (`#C75555`) |
| `brand-pink/10` / `/20` | tinted | `text-brand-pink-fg` (`#6E2940`) |

### Text

| Token | Hex | Usage |
|---|---|---|
| `text.primary` | `#1F1B16` | Headings, body, primary copy |
| `text.secondary` | `#4A453D` | Subheads, metadata, sidebar nav |
| `text.tertiary` | `#736B5C` | Captions, placeholders, low-emphasis labels |
| `text.dimmed` | `#A3998A` | Disabled, hint chrome |
| `text.muted` | `#5C5547` | Reading prose under `font-body` |
| `text.inverse` | `#FFFFFF` | Text on filled `-500` buttons |

Warm dark on mint reads less clinical than the pure navy of an OS settings screen. Don't reach for `#000000`.

### Borders, quest, system

| Token | Hex | Usage |
|---|---|---|
| `border.DEFAULT` / `card-border` | `#D7E5DA` | Card edges, default input border |
| `border.light` | `#E3EFE6` | Subtle dividers on mint |
| `border.dark` | `#B8CDBE` | Outline buttons, hover edges |
| `border.focus` | `#2F7D6A` | Focus ring (input + `*:focus-visible`) |
| `quest.track` | `#D7E5DA` | Progress bar background |
| `quest.fill` | `#2F7D6A` | Progress bar fill |

System tokens map to brand: `success` → primary, `warning` → secondary, `error` → `#C75555`, `info` → brand blue. Use the role token (`bg-error/10 text-error`), not the raw hex.

### The chat voice rule

Chat is where AI vs user identity is most load-bearing.

| Surface | Token | Rationale |
|---|---|---|
| AI avatar, AI badge, typing dots, "AI tools" hero glow | `bg-primary-100` / `text-primary-500` | Sage = AI voice |
| User bubble background, Send button, user avatar | `bg-brand-blue` / `text-white` | Dusty steel = the user's own ink |
| Tool-running pill (success) | `bg-primary-50 text-primary-fg` | Successful tool call = primary |
| Tool-running pill (error) | `bg-error/10 text-error` | Failed call = error token |
| Stop streaming button | `bg-error/10 text-error` | Destructive interrupt |
| Sign-in CTA in chat empty state | `bg-primary-500` | Primary brand action |

Do not paint the AI in `brand-blue`. Do not paint the user in `primary-500`. The voice differentiation is the whole point.

### Category accents (where rainbow is allowed)

EventCard, ChildCard, and category eyebrows are the only places we deploy a colored rainbow. The mapping is fixed:

| Category | Background | Foreground | Source |
|---|---|---|---|
| `appointment` | `bg-brand-pink/10` | `text-brand-pink-fg` | EventCard |
| `milestone` | `bg-secondary-50` | `text-secondary-fg` | EventCard, achievements |
| `activity` | `bg-primary-50` | `text-primary-fg` | EventCard, ChecklistCard |
| `reminder` | `bg-brand-blue/10` | `text-brand-blue` | EventCard |
| `other` / fallback | `bg-surface-light` | `text-text-secondary` | EventCard |
| Academy / lessons eyebrow | (none) | `text-brand-pink` | LessonCard, TodayCard |
| Article eyebrow | (none) | `text-brand-blue` | ArticleCard |

The reflection outcome triad in `TodayCard` reuses the same role tokens, not raw emerald/amber/rose: worked → primary, mixed → secondary, didn't work → error.

---

## Typography

### Fonts

| Role | Family | Tailwind | When |
|---|---|---|---|
| **Body / UI** | DM Sans | `font-sans`, `font-body` | Default everything: nav, chat, cards, settings, forms |
| **Headings** | Sora | `font-heading`, `font-display` | Section titles, page H1/H2, panel headers |
| **Celebration** | Fredoka | `font-game` | **Quarantined** to celebration moments only (see below) |
| **Persian / RTL** | Vazirmatn | auto-swap via `html.font-persian` | RTL mode, all roles fall back here |

Loaded in `index.html`: DM Sans, Sora, Fredoka, Nunito, Vazirmatn.

### Fredoka quarantine

Fredoka is the gamified voice. It only appears when *something good just happened*. Allowed:

- `.celebrate-headline`, `.celebrate-stat`, `.celebrate-eyebrow` utilities
- `.btn-duo-surface-pill` (e.g. "🎉 Celebrate")
- `.btn-duo-violet-pill` (premium / upgrade moment)
- AchievementUnlockModal, StreakCelebrationModal, LessonCompleteScreen, WeeklyRecapCard headline, XP-rise float, level-up badge

Banned: standard CTAs, nav, page headings, body copy, badges, chips, form labels. If a CTA reads as "shouting" rather than "celebrating," switch it to DM Sans.

### Sentence case, no spaced caps

Default copy is sentence case. Uppercase + letter-spaced eyebrows are reserved for celebration utilities. CTAs do not get `uppercase tracking-*`, that style belongs to the moment, not the chrome.

### Scale

| Token | Size | Line height | Default weight | Usage |
|---|---|---|---|---|
| `text-5xl` | 40px | 52px | 700 | Hero headlines |
| `text-4xl` | 32px | 44px | 700 | Page titles |
| `text-3xl` | 28px | 42px | 700 | Section headers |
| `text-2xl` | 24px | 36px | 600 | Card titles |
| `text-xl` | 20px | 30px | 600 | Sub-headers |
| `text-lg` | 18px | 27px | 500 | Lead / intro |
| `text-base` | 16px | 24px | 500 | Body |
| `text-sm` | 14px | 21px | 500 | Secondary |
| `text-xs` | 12px | 18px | 600 | Labels, badges |

Reading-dense surfaces (articles, AI chat, playbooks, onboarding copy) use `.font-body`, which sets DM Sans 16/1.65/400 with paragraph spacing. Sora headings use `.font-heading`.

---

## Buttons

### `.btn-duo` base

The base button is **flat, sentence-case, single-elevation, gentle scale on press**. No 3D slab, no uppercase, no Fredoka.

```css
min-height: 48px;
padding: 0 20px;
font-size: 15px;
font-weight: 600;        /* DM Sans semibold */
letter-spacing: -0.005em;
border-radius: 12px;     /* rounded-xl */

/* press */
transform: scale(0.985);
```

### Variants

| Class | Face | Text | Hover | Use |
|---|---|---|---|---|
| `.btn-duo-green` | `bg-primary-500` (`#2F7D6A`) | white | `bg-primary-600` | Default primary CTA |
| `.btn-duo-blue` | `bg-brand-blue` (`#4A8AB4`) | white | `bg-accent-blueHover` | Info / interactive / user-side actions |
| `.btn-duo-sky` | `bg-primary-400` (`#6DAA98`) | white | `bg-primary-500` | Secondary primary on white surfaces |
| `.btn-duo-gold` | `bg-secondary-500` (`#D87749`) | white | `#A45A30` | Celebration / reward |
| `.btn-duo-outline` | `bg-surface` + dark border | `text-primary-500` | `bg-surface-light` | Secondary outline |
| `.btn-duo-ghost` | transparent | `text-text-secondary` | `bg-surface-light` | Tertiary |

Compact variants (`*-sm`) drop to `min-h-10`, `px-4 py-2`, `text-sm`. Pill variants (`*-pill`, `*-pill-lg`) keep the same colors and swap to `rounded-full`.

### Celebration buttons (the only place 3D / Fredoka returns)

| Class | Shape | Face | Treatment | Use |
|---|---|---|---|---|
| `.btn-duo-surface-pill` | Pill, 2px `#D7E5DA` outline | white | Fredoka uppercase `tracking-[0.06em]`, `scale(0.98)` on press, no slab | "🎉 Mark complete" style celebration row |
| `.btn-duo-violet-pill` | Pill, no border | `#D87749` (peach) | Fredoka uppercase, 4px slab `#864E29`, `translateY(3px)` on press | "Try 1 week free", premium / trial / upgrade moments |

These are the entire 3D-button surface area now. Everywhere else uses the flat `.btn-duo-*` family.

### Sizing

| Variant | Min height | Padding | Radius |
|---|---|---|---|
| `.btn-duo` default | 48px | 0 20px | 12px (`rounded-xl`) |
| `*-sm` | 40px | 0 16px | 12px |
| `*-pill` | 44px | 0 20px | 9999px |
| `*-pill-lg` | 48px | 0 28px | 9999px |
| celebrate pill | 52px | 0 28-32px | 9999px |

---

## Inputs

```
background:    #FFFFFF (bg-surface)
border:        2px #D7E5DA (border)
border-radius: 14px (rounded-[14px])
min-height:    56px
font:          DM Sans 400 16px      ← 16px to prevent iOS zoom
color:         #1F1B16 (text-primary)
placeholder:   #677570 (text-tertiary)
focus border:  #2F7D6A (border-focus, sage)
focus ring:    2px primary @ 2px offset on background
```

Inputs sit on mint surfaces. They keep their labels above (not floating, not placeholder-only), per the clarity rule.

---

## Spacing & radius

### Spacing (4px base)

| Token | Value |
|---|---|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `2xl` | 40px |
| `3xl` | 48px |

### Radius (slightly tightened from Midnight)

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Tiny chips |
| `sm` | 8px | Small badges |
| `md` | 10px | Small buttons |
| `lg` | 14px | Inputs |
| `xl` | 18px | Standard card |
| `2xl` | 22px | Lessons, large cards |
| `3xl` | 28px | Modal, drawer |
| `full` | 9999px | Pills, avatars, full-width CTA |

---

## Shadows

Mint-paper shadows are cool and faint, never the dark navy drop-shadows of OLED UI.

```
sm  → 0 1px 2px  0 rgba(45, 60, 55, 0.06)
md  → 0 4px 12px 0 rgba(45, 60, 55, 0.07)
lg  → 0 8px 24px 0 rgba(45, 60, 55, 0.10)
xl  → 0 16px 40px 0 rgba(45, 60, 55, 0.12)
```

Celebration glows (`.glow-primary`, `.glow-gold`, `.glow-blue`) use saturated drop-shadows around icons/badges in achievement moments only.

The only sanctioned hard slab shadow is `.btn-duo-violet-pill`'s `0 4px 0 0 #864e29`, on the premium pill.

---

## Gamification components

### Streak (warm peach)

- Container: `bg-secondary-50` + `border border-secondary-100`, `rounded-2xl`
- Icon: flame in `text-gamification-streak` (`#D77548`)
- Active glow: `.streak-active` (CSS drop-shadow) or `.animate-streak-flame` (looping)
- Value: `.celebrate-stat` (Fredoka bold, tabular-nums)

### XP / points

- Pill: `.xp-badge` (`bg-secondary-50 text-secondary-fg`, rounded-full, bold)
- Star/icon: `text-gamification-xp` (`#9B7BBE`)
- Increment animation: `.animate-xp-rise` floats "+50 XP" up and out

### Progress bar

```
.duo-progress-track  → bg-quest-track (#D7E5DA), h-3, rounded-full
.duo-progress-fill   → bg-primary-500 (#2F7D6A), gloss strip overlay, 500ms ease
.duo-progress-fill--active → animated sweep shimmer for in-progress lessons
```

### SUPER badge

The only sanctioned gradient: `super.from #2F7D6A → super.to #D87749`. Reserved for the SUPER badge component.

---

## Cards

### Default card

```
bg:           #FFFFFF (bg-surface)
border:       1-2px #D7E5DA (border / card-border)
radius:       18px (rounded-xl) standard, 22px (rounded-2xl) for chat cards
shadow:       none by default, let the depth of the mint paper do the lifting
```

### `.duo-skill-card` (Academy lesson tiles)

```
bg:                    #FFFFFF
border:                2px #D7E5DA
radius:                22px (rounded-2xl)
hover (not locked):    translateY(-1px)
active (not locked):   translateY(2px)
active state class:    border-primary-500
locked:                opacity 0.45, cursor-not-allowed
```

### `.card-lift` / `.press` / `.press-sm`

Tactile feedback utilities: `.card-lift` lifts then settles on press; `.press` scales to 0.95 on tap; `.press-sm` scales to 0.97. Use on interactive rows that aren't already wrapped in a `btn-duo-*`.

---

## Avatar

- Shape: `rounded-full`
- AI assistant avatar: `bg-primary-100`, sage icon
- User avatar: `bg-primary-100` if signed in (matches initials), or `bg-brand-blue/15` when contextually user-voiced
- Initials: `font-weight: 700`, `text-text-primary`
- Sizes: sm 32px / md 40px / lg 56px / xl 80px

---

## Toggle switch

iOS-style toggle (see `.toggle-switch` in `index.css`):

- Off: `bg-#CBD5E1`
- On: `bg-primary-500` (`#2F7D6A`)
- Thumb: white, soft drop-shadow, stretches to 32px wide on press

---

## Utility classes (active inventory)

| Class | Description |
|---|---|
| `.btn-duo` | Flat sentence-case CTA base, 48px min, `scale(0.985)` press |
| `.btn-duo-green` / `-blue` / `-sky` / `-gold` / `-outline` / `-ghost` | Variants |
| `.btn-duo-*-sm` | Compact 40px variants |
| `.btn-duo-green-pill` / `-pill-lg` / `-outline-pill` / `-outline-pill-lg` | Pill variants |
| `.btn-duo-surface-pill` | Celebration outlined pill (Fredoka) |
| `.btn-duo-violet-pill` | Premium peach pill with 4px slab (Fredoka) |
| `.duo-action-link` | Sentence-case brand-blue link, weighty enough for tap |
| `.duo-progress-track` / `.duo-progress-fill` / `.duo-progress-fill--active` | Progress bar primitives + animated sweep |
| `.duo-skill-card` | Academy lesson card with tactile press |
| `.xp-badge` | Peach XP pill |
| `.streak-active` / `.animate-streak-flame` | Flame glow (static / looping) |
| `.celebrate-headline` / `.celebrate-stat` / `.celebrate-eyebrow` | Fredoka, quarantined |
| `.glow-primary` / `.glow-gold` / `.glow-blue` | Celebration icon halos |
| `.font-body` / `.font-heading` | Reading typography + headings |
| `.glass` | Frosted white card (`bg-white/85` + blur) |
| `.card-hover` / `.card-lift` | Tactile card lift |
| `.press` / `.press-sm` | Tactile press feedback |
| `.animate-bounce-in` / `-correct` / `-wrong` / `-xp-pop` / `-shimmer` | Standard motion |
| `.animate-scale-in` / `-fade-up` / `-fade-in` / `-slide-up` / `-float-slow` / `-pulse-glow` | Entrance / ambient motion |
| `.animate-xp-rise` / `-level-up` / `-star-earn` / `-heart-break` / `-achievement-pop` / `-confetti-burst` | Celebration motion (moments only) |
| `.stagger-children` | Adds 60ms cascade delays to direct children |
| `.scrollbar-none` | Hide scrollbar, keep scroll |
| `.toggle-switch` / `.toggle-switch-thumb` | iOS-style toggle |
| `.typing-dot` | Three-dot streaming indicator |

Removed since Midnight: `.gradient-sage`, `.gradient-hero`, `.duo-icon-bubble`, `.duo-bg-pattern`, `.glass-dark`, per-section nav color palette. If you need them back, restore from `index.css` history rather than re-inventing.

---

## Implementation notes

1. **Light mode only.** No `dark:` variant, no dark-mode toggle. The canvas is `#EEF6F0`.
2. **Tokens are the contract.** Use `bg-primary-500`, not `bg-[#2F7D6A]`. Inline hex codes are a smell, they survive the next palette refresh only by accident.
3. **AI voice = sage, user voice = brand-blue, destructive = error.** Don't cross the wires (see chat voice table).
4. **Fredoka is a celebration font.** If your CTA is reading as "shouting," switch it to DM Sans semibold sentence case via `.btn-duo`.
5. **No raw `bg-emerald-*`, `bg-rose-*`, `bg-amber-*`, `text-red-*`.** Map to `primary` / `secondary` / `error` / `info` tokens. Raw Tailwind palette colors short-circuit the design system.
6. **Reading surfaces use `.font-body`.** Long-form articles, AI chat bubbles, playbook descriptions, onboarding copy, settings.
7. **Icons inside flex containers get `flex-shrink-0`.** Otherwise they collapse when the label runs long.
8. **Touch targets: 40px minimum, 48px for primary CTAs.** Enforced by `button { min-height: 44px }` in `@layer base` and `.btn-duo { min-height: 48px }`.

---

## When the system bends

These are the rare exceptions where a hex shows up directly in markup, and they're documented here so they don't drift:

- `index.css` itself sets `#eef6f0` on `html` / `#root` to prevent flash before Tailwind paints.
- `.btn-duo-violet-pill` uses inline `#d87749` + `#864e29` for the 4px slab. (Same as `bg-secondary-500` + a manually-derived shadow ink.)
- Toggle switch off-state uses `#cbd5e1` (off-grey), since there's no semantic role for "muted neutral" yet.
- Gamification stat pills use `gamification.streak` (`#D77548`) and `gamification.xp` (`#9B7BBE`) so each stat has its own ink and the top bar reads as a row of distinct metrics.

Anything outside this list that hardcodes a hex is probably a bug, sweep it to a token.
