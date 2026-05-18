# Leap 01 — The Great Adjustment (0–3 Months)

Leap 01 covers the first developmental window, from birth to approximately three months. The core theme is **Extrauterine Adjustment**: the brain's transition from the managed environment of the womb to independent self-regulation.

## Directory Structure

```
Leap_01/
├── Foundation/          # Lesson markdown files (seeded to DB via seed-leap1.ts)
├── images/              # Source images for lessons (hero + body per lesson)
└── README.md
```

## Lesson Catalogue

| File | Lesson ID | Order | Title |
|------|-----------|------:|-------|
| `L1_0_0_Welcome.md` | `leap1-foundation-lesson-0` | 0 | Welcome: The Threshold of Witness |
| `L1_0_0b_Welcome_Curator.md` | `leap1-foundation-lesson-0b` | 5 | The Sensory Curator: Your First Role |
| `L1_0_1_Internal_Rhythm.md` | `leap1-foundation-lesson-1` | 10 | Internal Rhythm: The Mastery of Stillness |
| `L1_0_2_Great_Handover.md` | `leap1-foundation-lesson-2` | 20 | The Great Handover: Reflexes to Agency |
| `L1_0_3_Sensory_Anchor.md` | `leap1-foundation-lesson-3` | 30 | Sensory Anchor: The Invisible Map |
| `L1_0_4_Visual_Map.md` | `leap1-foundation-lesson-4` | 40 | Visual Map: The Geometry of Safety |
| `L1_0_5_Sound_Filter.md` | `leap1-foundation-lesson-5` | 50 | Sound Filter: The Melody of Connection |
| `L1_0_6_Social_Dawn.md` | `leap1-foundation-lesson-6` | 60 | Social Dawn: The First Mirror |
| `L1_0_7_Pulse_Expectation.md` | `leap1-foundation-lesson-7` | 70 | Pulse of Expectation: The Rhythm of Response |
| `L1_0_8_Mealtime_Bond.md` | `leap1-foundation-lesson-8` | 80 | Mealtime Bond: More Than Nutrition |
| `L1_0_GP_Growth_Profile.md` | `leap1-foundation-lesson-9` | 90 | Growth Profile: The Sixty-Day Consolidation |
| `L1_0_GPb_Growth_Signs.md` | `leap1-foundation-lesson-9b` | 95 | Growth Profile: Reading the Signs |

### Why the ×10 order scale?

The DB `order` field is an integer. Using multiples of 10 (0, 10, 20 … 90) leaves room for split "b" variants at `base×10 + 5` without renumbering existing lessons. Future splits (e.g. "c" variant) would use `base×10 + 7`.

## File Format

Each lesson `.md` file must follow this structure exactly:

```markdown
<!-- Source: Author (Year) p. XX: Chapter/Topic -->

<!-- hero: learning/raised-logic/{slug}/hero-title-{uuid}.png -->

{Opening scene — 1–2 sentences placing the parent in a recognizable moment}

![{Alt text describing the image}](learning/raised-logic/{slug}/body-opening-{uuid}.png)

{Science paragraph — the developmental mechanism, with **bold key terms**}

**{Actionable Tip Title}**
{1–2 sentences of practical guidance}

**{Actionable Tip Title}**
{1–2 sentences of practical guidance}

**{Actionable Tip Title}**
{1–2 sentences of practical guidance}

{Closing affirmation — 1–2 sentences reframing the parent's role}

---
```

### Word count target

- **350–480 words** per lesson
- Lessons exceeding ~500 words of dense prose (no H2 tip breaks) must be split into two files
- Lessons with 3 H2 tip sections are visually broken by the formatting and can run slightly longer

### Splitting a lesson

When a lesson is too long, split it into base (`L1_0_N_...`) and variant (`L1_0_Nb_...`) files:

1. Trim the original file to the opening scene + science paragraph + a one-sentence bridge closer
2. Create the `b` file with the remaining content, reformatted using H2 tips if not already
3. Both files reuse the same `<!-- hero: ... -->` image
4. The `body-opening` image should appear in the file where it best illustrates the content
5. Add the new lesson ID and title to `CLEAN_TITLES` in `sync-leap1-to-db.ts`

## Images

Each lesson requires two images, stored locally in `images/{slug}/` and served from the CDN at `learning/raised-logic/{slug}/`.

| Pattern | Role | Referenced via |
|---------|------|----------------|
| `hero-title-{uuid}.png` | Thumbnail in the path node popup and lesson header | `<!-- hero: learning/raised-logic/{slug}/hero-title-{uuid}.png -->` comment |
| `body-opening-{uuid}.png` | Inline image in the first scroll of content | `![alt text](learning/raised-logic/{slug}/body-opening-{uuid}.png)` |

When a lesson is split, both parts reuse the same `hero-title` image. The `body-opening` image should appear in the part that best benefits from the visual context.

## Syncing to the Database

```bash
# First-time seed — creates all DB records (course, phase, module, lessons)
cd raised-backend && npx tsx scripts/seed-leap1.ts

# Content sync — updates content/mediaUrl/title on existing records only
cd raised-backend && npx tsx scripts/sync-leap1-to-db.ts

# Dry-run preview
cd raised-backend && npx tsx scripts/sync-leap1-to-db.ts --dry-run
```

The sync script will not create new DB records — run `seed-leap1.ts` first when adding lessons.

## Naming Convention

```
L{leap}_{module}_{order}_{SlugTitle}.md       # standard lesson
L{leap}_{module}_{order}b_{SlugTitle}.md      # split part B
L{leap}_{module}_GP_{SlugTitle}.md            # Growth Profile
L{leap}_{module}_GPb_{SlugTitle}.md           # Growth Profile part B
```

## Source

All lessons are grounded in **Bornstein (2014)** — *Handbook of Parenting, Vol. 2*. The `<!-- Source: ... -->` comment at the top of each file references the specific page range.
