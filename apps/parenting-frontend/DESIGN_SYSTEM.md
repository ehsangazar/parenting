# Raised Design System

**Midnight** — OLED-first, gamified, parent-focused. Canonical reference: `design-system-proposal.html` (repo root) and **`tailwind.config.cjs`** (implementation source of truth).

Implemented in `tailwind.config.cjs` and `src/index.css` (3D `.btn-duo-*`, `.duo-progress-*`, `.font-body`, motion utilities).

---

## Clarity-first interaction rules

These rules apply to every screen in the parenting app. Optimize for "a tired parent on a phone gets it in one second."

1. **Every interactive control has a visible text label.** Aria labels are for assistive tech, not a substitute for legible UI. Icon-only buttons (trash, edit, expand chevron, ellipsis) are off-limits unless the user has already proven they understand the context (e.g. inside an already-open editor).
2. **Touch targets are 40px minimum, 48px for primary actions.** Use `min-h-[40px]` or `py-2.5+`. Avoid tiny `h-8 w-8` icon buttons for anything destructive or navigational.
3. **Expand and collapse affordances are explicit.** Either the entire row is the toggle (chevron is decorative), or the trigger reads "Show more" / "Show less". Don't ask the user to spot a small chevron.
4. **Destructive actions always carry the word.** "Delete", "Remove", "Sign out" — never a lone trash icon. Pair the word with a danger color and require confirmation for irreversible ops.
5. **Edit affordances are labeled too.** Use a full-width "Edit" button or icon-plus-word. Inline pencil icons alone are too easy to miss.
6. **Active state is unambiguous.** Use both a background tint *and* a labeled badge ("Active"), not just a color shift.
7. **Errors and empty states tell the user what to do next**, with a labeled action ("Add a child", "Invite a partner"), not just descriptive text.

When space is tight, drop visual chrome (cards, borders, padding) before dropping labels.

### Worked examples

| Screen | Before (wrong) | After (right) |
|---|---|---|
| Chat input dock | 36px icon-only send button with arrow; spinner-icon while streaming; no stop affordance | Rounded "Send" pill with text + arrow at 44px; while streaming, replaced by a red labeled "Stop" pill |
| Chat empty state (logged-out) | Faint paragraph: "Sign in to start chatting, we'll remember your draft." | Primary "Sign in to send" button + hint line |
| History sidebar conversation row | Trash icon, opacity-0 until hover (invisible on touch) | Always-visible labeled "Delete conversation" button on a second line, opens a confirm modal |
| History sidebar selected conversation | Background tint only | Background tint + bordered card + "Selected" pill |
| Family card header | Tiny chevron-only expand toggle on the right | Whole header is the toggle, with a bordered "Show more" / "Show less" pill carrying the chevron |
| Family member row | Icon-only trash for remove | Labeled "Remove member" button on a second line |
| Family child row | Icon-only pencil + trash | Side-by-side labeled "Edit" and "Remove child" buttons |
| Settings sign out | Direct click signs out | Click opens a "Sign out? You can sign back in any time" confirm modal |

### Confirmation modals

Any irreversible action (delete account, delete conversation, delete family, remove child, remove member, sign out) must route through a confirmation modal with:

- Title that states what's being deleted in plain language.
- Body that explains the consequence ("This cannot be undone").
- Two labeled buttons: Cancel (neutral) and the destructive verb (red).
- 44px minimum height on both buttons.

---

## Color Palette (Midnight)

### Backgrounds

| Token | Hex | Usage |
|---|---|---|
| `background` | `#0E0E1A` | App canvas — midnight-indigo OLED |
| `surface.DEFAULT` | `#171728` | Cards, inputs, panels |
| `surface.light` | `#21213A` | Elevated rows, hover |
| `surface.warm` | `#2A2A4A` | Stronger elevation |

---

### Brand & accents

| Role | Hex | Tailwind |
|---|---|---|
| **Primary (teal-mint)** | `#3DDC97` | `primary.400`, `brand.green` |
| **Growth / amber** | `#FF9F51` | `secondary.400`, streak & rewards |
| **Accent (soft indigo)** | `#7B8FFF` | `brand.blue`, links, AI, focus |
| **Energy / hearts** | `#FF6B6B` | `brand.red`, `error` |
| **Stars / gems** | `#C084FC` | `brand.purple` |

Primary shadow (3D buttons): `#22A86A` (`primary.500`). Secondary shadow: `#D9772E`. Blue shadow: `#5A6FD4`.

---

### Text

| Token | Hex |
|---|---|
| `text.primary` | `#F0F4FF` |
| `text.secondary` | `#9AA8C0` |
| `text.tertiary` | `#5A6A88` |
| `text.inverse` | `#0E0E1A` (on bright buttons) |

---

### Borders & quest UI

| Token | Hex |
|---|---|
| `border.*` / `card-border` | `#2E2E50` |
| `border.focus` | `#7B8FFF` |
| `quest.track` | `#21213A` |

---

### System

| Token | Hex |
|---|---|
| `success` | `#3DDC97` |
| `warning` | `#FF9000` |
| `error` | `#FF6B6B` |
| `info` | `#7B8FFF` |

---

## Typography

### Fonts (Midnight)

| Role | Family | Tailwind |
|---|---|---|
| **Body / UI** | DM Sans | `font-sans`, `font-body` |
| **Display / section titles** | Sora | `font-heading`, `font-display` |
| **Gamification** (CTAs, stats, badges) | Fredoka | `font-game` |

Loaded in `index.html` with DM Sans, Sora, Fredoka, Nunito.

### Scale

| Token | Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| `text-5xl` | 40px | 60px | 700 | Hero headlines |
| `text-4xl` | 32px | 48px | 700 | Page titles |
| `text-3xl` | 28px | 42px | 700 | Section headers |
| `text-2xl` | 24px | 36px | 600 | Card titles |
| `text-xl` | 20px | 30px | 600 | Sub-headers |
| `text-lg` | 18px | 27px | 500 | Lead / intro text |
| `text-base` | 16px | 24px | 500 | Body copy |
| `text-sm` | 14px | 21px | 500 | Secondary text |
| `text-xs` | 12px | 18px | 600 | Labels, badges |

### CTA / Button text rule

All button text: **uppercase + letter-spacing: 0.08em + font-weight: 700**

```css
text-transform: uppercase;
font-weight: 700;
letter-spacing: 0.08em;
```

### Action link rule ("USE ANOTHER ACCOUNT", "FORGOT?")

```
color: #7B8FFF (accent / brand.blue)
font-weight: 700
text-transform: uppercase
letter-spacing: 0.08em
font-size: 13px
```
Use `.duo-action-link` utility class.

---

## Buttons

### 3D press rule

Every CTA has a **solid bottom shadow** (not blurred) creating a raised feel. On `:active` it drops and squashes.

```css
/* Resting */
border-radius: 16px;
box-shadow: 0 4px 0 0 <shadow-color>;

/* Active */
transform: translateY(3px);
box-shadow: 0 1px 0 0 <shadow-color>;
```

### Variants

| Class | Background | Text | Shadow | Use |
|---|---|---|---|---|
| `.btn-duo-green` | `#3DDC97` | `#FFFFFF` | `#22A86A` | Primary CTA — success / continue |
| `.btn-duo-blue` | `#7B8FFF` | `#FFFFFF` | `#5A6FD4` | Interactive / info actions |
| `.btn-duo-sky` | `#5ED4C8` | `#0E0E1A` | `#2A9B8A` | Bright tactile chip |
| `.btn-duo-gold` | `#FF9F51` | `#FFFFFF` | `#D9772E` | Growth / reward actions |
| `.btn-duo-outline` | `#171728` | `#7B8FFF` | `#050508` | Secondary outline |
| `.btn-duo-ghost` | `#171728` | `#9AA8C0` | `#050508` | Tertiary |

### Extended patterns (reference implementations)

These mirror common **game / tactile** button languages: rounded slab (`.btn-duo-*`), **outlined pill** on near-black, and **saturated 3D pill** with a deeper shadow step.

| Class | Shape | Face | Label | Border / depth | Use |
|---|---|---|---|---|---|
| `.btn-duo-sky` | Rounded rect (`rounded-2xl`) | Sky blue `#5BC8F5` | `#1A1A1A` | `0 4px 0` slab `#3BA8D8` | High-energy secondary CTA on dark sections |
| `.btn-duo-surface-pill` | Pill (`rounded-full`) | `#1a202c` (`background` token) | `#FFFFFF` | **3px** solid `#374151`, no slab | Celebrations, soft CTAs with icon + label (`inline-flex` + `gap-2`) |
| `.btn-duo-violet-pill` | Pill (`rounded-full`) | `#5856D6` | `#FFFFFF` | **`0 6px 0`** slab `#3A3A99` | Premium / trial lines ("Try 1 week free"); heavier press than 4px variants |

**Pressed state:** `.btn-duo-surface-pill` uses a light `scale(0.98)` on active. All slab variants use **`translateY`** so the face meets the shadow slab — violet uses **5px** travel to pair with the **6px** shadow.

**Celebrate row:** Combine `.btn-duo-surface-pill` with a leading emoji or icon (e.g. `🎉`), `gap-2`, and `flex-shrink-0` on the icon per icon rule below.

```tsx
<button type="button" className="btn-duo-surface-pill">
  <span className="text-lg flex-shrink-0" aria-hidden>🎉</span>
  Celebrate
</button>
```

### Sizing

| Variant | Height | Padding | Radius |
|---|---|---|---|
| Default | 56px | 0 24px | 16px |
| Pill (full-width) | 56px | 0 32px | 9999px |
| Small | 40px | 0 16px | 12px |

---

## Inputs

```
background:    #1f2937
border:        2px solid #243040
border-radius: 14px
height:        56px
font:          Fredoka 500 16px
color:         #FFFFFF
placeholder:   #6C8A9C
focus border:  #1CB0F6 (Macaw Blue)
```

No visible label — placeholder acts as label and clears on focus.
"FORGOT?" sits inline at trailing edge in `#6C8A9C`.

---

## Spacing

4px base unit — all spacing is a multiple.

| Token | Value |
|---|---|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `2xl` | 40px |
| `3xl` | 48px |

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Tiny chips |
| `sm` | 8px | Small badges |
| `md` | 12px | Small buttons/cards |
| `lg` | 16px | Standard button, standard card |
| `xl` | 20px | Large card |
| `2xl` | 24px | Sidebar nav items, stat tiles |
| `3xl` | 32px | Modal, drawer |
| `full` | 9999px | Pills, avatars, full-width CTA |

---

## Shadows

### 3D button shadows

```
--duo-shadow-green:  0 4px 0 0 #46A502
--duo-shadow-gold:   0 4px 0 0 #DBA500
--duo-shadow-blue:   0 4px 0 0 #009FDE
--duo-shadow-sky:    0 4px 0 0 #3BA8D8
--duo-shadow-red:    0 4px 0 0 #CC2222
--duo-shadow-dark:   0 4px 0 0 #1a202c   (outline/ghost buttons)
--duo-shadow-violet-pill: 0 6px 0 0 #3A3A99   (.btn-duo-violet-pill — deeper slab)
```

### Elevation shadows (cards, modals)

```
sm  → 0 2px 0 0 rgba(0,0,0,0.40)
md  → 0 4px 12px 0 rgba(0,0,0,0.45)
lg  → 0 8px 24px 0 rgba(0,0,0,0.55)
xl  → 0 16px 40px 0 rgba(0,0,0,0.65)
```

Higher opacity than typical light-mode shadows — needed for depth on dark bg.

---

## Gamification Components

### Streak (Bee Yellow / Orange)
- Container: `bg-orange-900/30`, `border-orange-800/40`, `rounded-2xl`
- Icon: `<Flame>` in `text-orange-400`, active glow: `streak-active` CSS class
- Value: `font-weight: 700`, `text-orange-400`

### XP / Points (Bee Yellow)
- Container: `bg-yellow-900/25`, `border-yellow-800/30`
- Icon: `<Star>` in `text-yellow-400`
- Badge: `.xp-badge` — `bg-yellow-900/30`, `text-yellow-400`, pill-shaped

### Progress Bar
```
Track:      #243040, height 16px, rounded-full
Fill:       #58CC02 (Feather Green), inset gloss highlight
Gloss:      ::after — 35% white, 4px strip, inset from top
Transition: width 0.6s spring
```
Classes: `.duo-progress-track` + `.duo-progress-fill`

---

## Avatar

- Shape: `rounded-full`
- Default bg: `#CE82FF` (Orchid Purple — Duolingo default)
- Initials: `font-weight: 700`, `color: #1a202c` (dark text on purple)
- Sizes: sm 32px / md 40px / lg 56px / xl 80px

---

## Navigation

### Bottom tab bar (mobile)
- Background: `#1f2937`
- Border top: `2px solid #243040`
- Active icon: colored bubble (`border-radius: 12px`, section color at 13% opacity)
- Active icon color: section accent color (full saturation)
- Active icon scale: `1.1`
- Active label: section color, `font-weight: 700`, uppercase, `9px`
- Inactive icon/label: `#6C8A9C`

### Sidebar (desktop)
- Background: `#1f2937`
- Border right: `2px solid #243040`
- Active item bg: `#243040`
- Active icon bubble: `${sectionColor}22` (22 = ~13% opacity)
- Inactive icon bubble: `#243040`
- Text active: `#FFFFFF`, inactive: `#6C8A9C`
- Font: `700`, 14px

### Per-section colors
| Section | Color |
|---|---|
| Home | `#58CC02` Feather Green |
| AI Assistant | `#1CB0F6` Macaw Blue |
| Village | `#CE82FF` Orchid Purple |
| Academy | `#FFC800` Bee Yellow |
| Moments | `#FF4B4B` Cardinal Red |
| Calendar | `#1CB0F6` Macaw Blue |
| Insights | `#FF9600` Orange |
| Resources | `#58CC02` Feather Green |
| Settings | `#58CC02` Feather Green |

---

## Cards (duo-skill-card)

```
background:    #1f2937
border:        2px solid #243040
border-radius: 16px
box-shadow:    0 4px 0 0 #0D1117   ← 3D press effect
hover shadow:  0 6px 0 0 #0D1117, translateY(-1px)
active:        translateY(3px), 0 1px 0 0 #0D1117
active state:  border #58CC02, shadow #46A502
locked state:  opacity 0.45
```

---

## Utility Classes

| Class | Description |
|---|---|
| `.btn-duo` | Base 3D tactile button |
| `.btn-duo-green` | Primary green CTA |
| `.btn-duo-blue` | Indigo accent CTA |
| `.btn-duo-sky` | Sky blue bright CTA |
| `.btn-duo-gold` | Gold XP/reward CTA |
| `.btn-duo-outline` | Secondary outlined button |
| `.btn-duo-ghost` | Tertiary ghost button |
| `.btn-duo-surface-pill` | Outlined pill on charcoal — icon + white label (celebrate / soft CTA) |
| `.btn-duo-violet-pill` | Saturated violet 3D pill — premium / trial (6px slab) |
| `.duo-action-link` | Uppercase bold link (FORGOT? / USE ANOTHER ACCOUNT) |
| `.duo-progress-track` | Progress bar container |
| `.duo-progress-fill` | Progress bar fill + gloss |
| `.duo-skill-card` | 3D press skill/lesson card |
| `.duo-icon-bubble` | Colored icon container |
| `.duo-bg-pattern` | Scattered decorative background icons |
| `.xp-badge` | Gold XP pill badge |
| `.streak-active` | Orange glow on flame icon |
| `.glass` | Dark frosted glass |
| `.card-hover` | Lift on hover |
| `.gradient-sage` | Feather green gradient |
| `.gradient-hero` | Subtle multi-color radial bg |
| `.animate-bounce-in` | Bouncy scale-in entrance |
| `.animate-correct` | Green flash (correct answer) |
| `.animate-wrong` | Horizontal shake (wrong answer) |
| `.animate-xp-pop` | XP counter pop |
| `.animate-shimmer` | Dark loading skeleton |

---

## Implementation Notes

1. **No light mode toggle** — this palette is the default, not a `dark:` variant
2. **Never use white backgrounds** — minimum surface is `#1f2937`
3. **Brand accents stay vivid on midnight canvas** — teal `#3DDC97`, indigo `#7B8FFF`, amber `#FF9F51` are the primary accents; use opacity tints (`/10`, `/15`) for subtle fills.
4. **Reading surfaces** — use `font-body` (DM Sans) on long-form markdown / articles; use `font-game` (Fredoka) on CTAs and stat chrome.
5. **Sync with mobile** — keep `tailwind.config.cjs` surface/text/border tokens in sync with `raised-mobile/src/theme/index.ts`
6. **Icon shrink** — always `flex-shrink-0` on icons inside flex containers
