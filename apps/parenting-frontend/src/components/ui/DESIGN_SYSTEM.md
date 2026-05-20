# UI components (quick reference)

**Palette & typography:** see `apps/parenting-frontend/DESIGN_SYSTEM.md`. **Confident Calm (Garden Morning)** is canonical (pale-mint canvas, sage-teal primary, warm peach for celebration).

| Export | Role |
|--------|------|
| `DuoButton` | Flat sentence-case CTAs (`.btn-duo-*`). Variants: `green` (primary), `blue` (info / user-side), `sky`, `gold` (celebration), `outline`, `ghost`. |
| `DuoCard` | Cards + skill-card variant (`.duo-skill-card` for Academy lessons) |
| `ProgressBar` | Track + fill (`.duo-progress-*`). Props: `value` 0-100, optional `animated`, `current`/`max` + `showLabel`, `color`, `size` |
| `StatPill` | Top-bar streak / XP / gems row, each metric has its own ink |
| `LevelBadge` | Level + XP progress, celebration-ready |
| `Badge`, `Avatar`, `Skeleton`, `DuoInput`, ... | Barrel: `index.ts` |

**Card borders:** use `border-card-border` (`#D7E5DA`). Default card surface is `bg-surface` (`#FFFFFF`) on the mint canvas, no drop-shadow needed.

**Reminders:**
- Use tokens, not inline hex. `bg-primary-500`, never `bg-[#2F7D6A]`.
- Fredoka (`font-game`) is quarantined to `.celebrate-*` utilities and the surface / violet pills. Default CTA text is DM Sans semibold sentence case.
- AI voice = sage (`primary`), user voice = brand-blue, destructive = `error`. Don't cross the wires.
