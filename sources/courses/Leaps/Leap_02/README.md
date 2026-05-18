# Leap 02 — The Birth of Intentional Agency (3–6 Months)

Leap 02 covers the second developmental window, from approximately three to six months. The core theme is **Intentional Agency**: the brain's transition from reflexive subcortical automation to voluntary cortical control, culminating in the infant's first discovery that their actions can change the world around them.

## Directory Structure

```
Leap_02/
├── Foundation/          # Lesson markdown files (seeded to DB via seed-leap2.ts)
├── images/              # Source images for lessons (hero + body per lesson)
└── README.md
```

## Lesson Catalogue

| File | Lesson ID | Order | Title |
|------|-----------|------:|-------|
| `L2_0_0_Welcome_Leap_02.md` | `leap2-foundation-lesson-0` | 0 | Welcome: The Birth of Intentional Agency |
| `L2_0_1_Physical_Agency.md` | `leap2-foundation-lesson-1` | 10 | Physical Agency: The First Victory Against Gravity |
| `L2_0_2_Grasping_Hook.md` | `leap2-foundation-lesson-2` | 20 | Grasping Hook: From Reflex to Will |
| `L2_0_3_Crossing_the_Midline.md` | `leap2-foundation-lesson-3` | 30 | Crossing the Midline: The Bridge Between Worlds |
| `L2_0_4_The_3D_World.md` | `leap2-foundation-lesson-4` | 40 | The 3D World: The Birth of Depth |
| `L2_0_5_Audio_Visual_Logic.md` | `leap2-foundation-lesson-5` | 50 | Audio-Visual Logic: The Architecture of a Coherent World |
| `L2_0_6_Accidental_Agency.md` | `leap2-foundation-lesson-6` | 60 | Accidental Agency: The First Cause and Effect |
| `L2_0_7_The_Weather_Forecast.md` | `leap2-foundation-lesson-7` | 70 | The Weather Forecast: The Storm Before the Calm |
| `L2_0_8_Mealtime_Bond.md` | `leap2-foundation-lesson-8` | 80 | Mealtime Bond: The Social Laboratory |
| `L2_0_GP_Summary_Leap_02.md` | `leap2-foundation-lesson-9` | 90 | Growth Profile: The Six-Month Consolidation |

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
- Lessons exceeding ~500 words of dense prose (no tip breaks) must be split into two files
- Lessons with 3 tip sections are visually broken by the formatting and can run slightly longer

### Splitting a lesson

When a lesson is too long, split it into base (`L2_0_N_...`) and variant (`L2_0_Nb_...`) files:

1. Trim the original file to the opening scene + science paragraph + a one-sentence bridge closer
2. Create the `b` file with the remaining content, reformatted using tip sections if not already
3. Both files reuse the same `<!-- hero: ... -->` image
4. The `body-opening` image should appear in the file where it best illustrates the content
5. Add the new lesson ID and title to `CLEAN_TITLES` in `sync-leap2-to-db.ts`

## Images

Each lesson requires two images, stored locally in `images/{slug}/` and served from the CDN at `learning/raised-logic/{slug}/`.

| Pattern | Role | Referenced via |
|---------|------|----------------|
| `hero-title-{uuid}.png` | Thumbnail in the path node popup and lesson header | `<!-- hero: learning/raised-logic/{slug}/hero-title-{uuid}.png -->` comment |
| `body-opening-{uuid}.png` | Inline image in the first scroll of content | `![alt text](learning/raised-logic/{slug}/body-opening-{uuid}.png)` |

Before images are generated, files use placeholder comments:
- Hero: `<!-- hero-todo: l2-{slug} -->`
- Body: `<!-- image-slot: body — {description} -->`

When a lesson is split, both parts reuse the same `hero-title` image. The `body-opening` image should appear in the part that best benefits from the visual context.

## Syncing to the Database

```bash
# First-time seed — creates all DB records (course, phase, module, lessons)
cd raised-backend && npx tsx scripts/seed-leap2.ts

# Content sync — updates content/mediaUrl/title on existing records only
cd raised-backend && npx tsx scripts/sync-leap2-to-db.ts

# Dry-run preview
cd raised-backend && npx tsx scripts/sync-leap2-to-db.ts --dry-run

# Generate images (requires seed to have run first)
cd raised-backend && npx tsx scripts/generate-leap2-images.ts --dry-run
cd raised-backend && npx tsx scripts/generate-leap2-images.ts
```

The sync script will not create new DB records — run `seed-leap2.ts` first when adding lessons.

## Naming Convention

```
L{leap}_{module}_{order}_{SlugTitle}.md       # standard lesson
L{leap}_{module}_{order}b_{SlugTitle}.md      # split part B
L{leap}_{module}_GP_{SlugTitle}.md            # Growth Profile
L{leap}_{module}_GPb_{SlugTitle}.md           # Growth Profile part B
```

## Source

All lessons are grounded in **Bornstein (2014)** — *Handbook of Parenting, Vol. 2*. The `<!-- Source: ... -->` comment at the top of each file references the specific page range and chapter relevant to each lesson's developmental topic.

## Build Log (2026-05-04)

The following steps were completed to bring Leap 02 from raw markdown to a fully live course.

### Content check

All 10 Foundation lessons were measured. None exceeded the 500-word limit, so no splits were needed.

| Lesson | Words | Characters (stripped) |
|--------|------:|----------------------:|
| L2_0_0 Welcome | 358 | 2,339 |
| L2_0_1 Physical Agency | 394 | 2,374 |
| L2_0_2 Grasping Hook | 365 | 2,266 |
| L2_0_3 Crossing the Midline | 376 | 2,401 |
| L2_0_4 The 3D World | 380 | 2,283 |
| L2_0_5 Audio-Visual Logic | 377 | 2,392 |
| L2_0_6 Accidental Agency | 372 | 2,349 |
| L2_0_7 The Weather Forecast | 383 | 2,425 |
| L2_0_8 Mealtime Bond | 394 | 2,405 |
| L2_0_GP Growth Profile | 315 | 1,959 |

### Scripts run (in order)

```bash
cd raised-backend

# 1. Seed DB — created course, phase, module, and 10 lesson records
npx tsx scripts/seed-leap2.ts

# 2. Sync — wrote cleaned content and clean titles to all 10 lessons
npx tsx scripts/sync-leap2-to-db.ts

# 3. Images — generated 20 images (1 hero + 1 body per lesson),
#    uploaded to S3, saved local copies to Leaps/Leap_02/images/,
#    patched Foundation markdown files with real S3 keys, updated DB mediaUrl
npx tsx scripts/generate-leap2-images.ts

# 4. Course cover — generated leap2-foundation.png, saved to
#    raised-frontend/public/course-covers/, updated DB coverImageUrl
npx tsx scripts/generate-course-covers.ts
```

### DB records created

| Record type | ID |
|------------|-----|
| LearningCourse | `leap2-foundation` (order 1, minAge 3, maxAge 6) |
| LearningPhase | `leap2-foundation-phase` |
| LearningModule | `leap2-foundation-module` |
| LearningLesson x10 | `leap2-foundation-lesson-0` through `leap2-foundation-lesson-9` |

### Image files produced

- `raised-frontend/public/course-covers/leap2-foundation.png` (course card cover)
- `Leaps/Leap_02/images/l2-{slug}/hero-title-{uuid}.png` x10
- `Leaps/Leap_02/images/l2-{slug}/body-opening-{uuid}.png` x10
- All 20 images also live on S3 at `learning/raised-logic/l2-{slug}/`

### generate-course-covers.ts updated

Added the `leap2-foundation` job to `raised-backend/scripts/generate-course-covers.ts` so it is included in future re-runs alongside Leap 1.
