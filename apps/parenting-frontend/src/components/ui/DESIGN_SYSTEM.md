# UI components (quick reference)

**Palette & typography:** see **`DESIGN_SYSTEM.md`** at the repo root (`raised-frontend/DESIGN_SYSTEM.md`) — **Midnight** is canonical.

| Export | Role |
|--------|------|
| `DuoButton` | 3D tactile CTAs (`.btn-duo-*`) |
| `DuoCard` | Cards + skill-card variant |
| `ProgressBar` | Track + fill (`.duo-progress-*`). Props: `value` 0–100, optional `animated`, `current`/`max` + `showLabel`, `color`, `size` |
| `StatPill` | Streak / XP / gems / lives row |
| `LevelBadge` | Level + XP progress |
| `Badge`, `Avatar`, `Skeleton`, `DuoInput`, … | Barrel: `index.ts` |

**Card borders:** use `border-card-border` (Midnight: `#2E2E50`).
