# Leap 05 — The Discovery Lens (13–18 Months)

Leap 05 covers the fifth developmental window, from approximately thirteen to eighteen months. The core theme is **The Discovery Lens**: the brain's transition from reactive absorption to purposeful agency, culminating in independent walking, the vocabulary spurt, tertiary circular reactions, tool logic, and the rise of the Functional No.

## Directory Structure

```
Leap_05/
├── Foundation/          # Lesson markdown files (seeded to DB via seed-leap5.ts)
├── images/              # Source images for lessons (hero + body per lesson)
└── README.md
```

## Lesson Catalogue

| File | Lesson ID | Order | Title |
|------|-----------|------:|-------|
| `L5_0_0_Welcome.md` | `leap5-foundation-lesson-0` | 0 | Welcome: The Discovery Lens |
| `L5_0_1_Tertiary_Reactions.md` | `leap5-foundation-lesson-1` | 10 | Tertiary Reactions: The Experimenter's Loop |
| `L5_0_2_Independent_Walking.md` | `leap5-foundation-lesson-2` | 20 | Independent Walking: Gravitational Freedom |
| `L5_0_3_Word_Eruption.md` | `leap5-foundation-lesson-3` | 30 | Word Eruption: The Meaning Spurt |
| `L5_0_4_Secure_Base.md` | `leap5-foundation-lesson-4` | 40 | Secure Base: The Elastic Tether |
| `L5_0_5_Functional_No.md` | `leap5-foundation-lesson-5` | 50 | The Functional No: The Assertive Boundary |
| `L5_0_6_Tool_Logic.md` | `leap5-foundation-lesson-6` | 60 | Tool Logic: The Extended Hand |
| `L5_0_7_Fine_Manipulatives.md` | `leap5-foundation-lesson-7` | 70 | Fine Manipulatives: The Page Turner |
| `L5_0_GP_Growth_Profile.md` | `leap5-foundation-lesson-8` | 80 | Growth Profile: The Discovery Lens |

## Syncing to the Database

```bash
# First-time seed — creates all DB records (course, phase, module, lessons)
cd raised-backend && npx tsx scripts/seed-leap5.ts

# Content sync — updates content/mediaUrl/title on existing records only
cd raised-backend && npx tsx scripts/sync-leap5-to-db.ts

# Dry-run preview
cd raised-backend && npx tsx scripts/sync-leap5-to-db.ts --dry-run

# Generate images (requires seed to have run first)
cd raised-backend && npx tsx scripts/generate-leap5-images.ts --dry-run
cd raised-backend && npx tsx scripts/generate-leap5-images.ts
```

## Build Log (2026-05-04)

### Scripts run (in order)

```bash
cd raised-backend

# 1. Seed DB — created course, phase, module, and 9 lesson records
npx tsx scripts/seed-leap5.ts

# 2. Sync — wrote cleaned content and clean titles to all 9 lessons
npx tsx scripts/sync-leap5-to-db.ts

# 3. Images — generated 18 images (1 hero + 1 body per lesson),
#    uploaded to S3, saved local copies to Leaps/Leap_05/images/,
#    patched Foundation markdown files with real S3 keys, updated DB mediaUrl
npx tsx scripts/generate-leap5-images.ts  # 18/18 in single pass

# 4. Course cover — generated leap5-foundation.png (1313 KB), saved to
#    raised-frontend/public/course-covers/, updated DB coverImageUrl
npx tsx scripts/generate-course-covers.ts
```

### DB records created

| Record type | ID |
|------------|-----|
| LearningCourse | `leap5-foundation` (order 4, minAge 13, maxAge 18) |
| LearningPhase | `leap5-foundation-phase` |
| LearningModule | `leap5-foundation-module` |
| LearningLesson x9 | `leap5-foundation-lesson-0` through `leap5-foundation-lesson-8` |

### Image files produced

- `raised-frontend/public/course-covers/leap5-foundation.png` (course card cover)
- `Leaps/Leap_05/images/l5-{slug}/hero-title-{uuid}.png` x9
- `Leaps/Leap_05/images/l5-{slug}/body-opening-{uuid}.png` x9
- All 18 images also live on S3 at `learning/raised-logic/l5-{slug}/`

### generate-course-covers.ts updated

Added the `leap5-foundation` job to `raised-backend/scripts/generate-course-covers.ts` so it is included in future re-runs alongside Leaps 1, 2, 3, and 4.

### Apostrophe note

Placeholder strings in `generate-leap5-images.ts` and the Foundation markdown files were written without possessive apostrophes to prevent the curly-vs-straight apostrophe mismatch that caused 2 Leap_04 body images to be silently skipped on first pass. All 18 Leap_05 images were generated in a single pass.
