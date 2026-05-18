# Leap 04 — The Symbolic Bridge (9–12 Months)

Leap 04 covers the fourth developmental window, from approximately nine to twelve months. The core theme is **The Symbolic Bridge**: the brain's transition from functional communication (pointing, reaching) to true symbolic representation, culminating in first words, cruising/standing, the superior pincer grasp, and the mastery of social referencing.

## Directory Structure

```
Leap_04/
├── Foundation/          # Lesson markdown files (seeded to DB via seed-leap4.ts)
├── images/              # Source images for lessons (hero + body per lesson)
└── README.md
```

## Lesson Catalogue

| File | Lesson ID | Order | Title |
|------|-----------|------:|-------|
| `L4_0_0_Welcome.md` | `leap4-foundation-lesson-0` | 0 | Welcome: The Symbolic Bridge |
| `L4_0_1_Vessel_Geometry.md` | `leap4-foundation-lesson-1` | 10 | Vessel Geometry: Container Mastery |
| `L4_0_2_Vertical_Voyage.md` | `leap4-foundation-lesson-2` | 20 | Vertical Voyage: Cruising and Standing |
| `L4_0_3_Precise_Sculptor.md` | `leap4-foundation-lesson-3` | 30 | The Precise Sculptor: Superior Pincer Grasp |
| `L4_0_4_First_Symbol.md` | `leap4-foundation-lesson-4` | 40 | First Symbol: The Birth of Language |
| `L4_0_5_Language_Sponge.md` | `leap4-foundation-lesson-5` | 50 | The Language Sponge: Receptive Vocabulary |
| `L4_0_6_Emotional_GPS.md` | `leap4-foundation-lesson-6` | 60 | Emotional GPS: Social Referencing |
| `L4_0_7_Anchors_Pull.md` | `leap4-foundation-lesson-7` | 70 | The Anchor's Pull: Secure Base Refueling |
| `L4_0_8_Assertive_No.md` | `leap4-foundation-lesson-8` | 80 | The Assertive No: Agency and Self-Concept |
| `L4_0_GP_Growth_Profile_1y.md` | `leap4-foundation-lesson-9` | 90 | Growth Profile: The One-Year Milestone |

### Note on .tmp files

The Foundation directory contains empty `.md.tmp` stub files alongside each lesson. These are inert artifacts and are ignored by all scripts (which filter for `.md` only).

### Apostrophe note for future image re-generation

If markdown placeholder comments contain apostrophes (e.g. `infant's`), the Edit tool may store them as curly Unicode apostrophes (`'` U+2019) rather than straight ASCII (`'` U+0027). The TypeScript generate script uses straight apostrophes in its placeholder strings. If image jobs are unexpectedly skipped, run a python fix to normalise apostrophes in the relevant image-slot comments before re-running the generate script.

## Syncing to the Database

```bash
# First-time seed — creates all DB records (course, phase, module, lessons)
cd raised-backend && npx tsx scripts/seed-leap4.ts

# Content sync — updates content/mediaUrl/title on existing records only
cd raised-backend && npx tsx scripts/sync-leap4-to-db.ts

# Dry-run preview
cd raised-backend && npx tsx scripts/sync-leap4-to-db.ts --dry-run

# Generate images (requires seed to have run first)
cd raised-backend && npx tsx scripts/generate-leap4-images.ts --dry-run
cd raised-backend && npx tsx scripts/generate-leap4-images.ts
```

## Build Log (2026-05-04)

### Scripts run (in order)

```bash
cd raised-backend

# 1. Seed DB — created course, phase, module, and 10 lesson records
npx tsx scripts/seed-leap4.ts

# 2. Sync — wrote cleaned content and clean titles to all 10 lessons
npx tsx scripts/sync-leap4-to-db.ts

# 3. Images — generated 20 images (1 hero + 1 body per lesson),
#    uploaded to S3, saved local copies to Leaps/Leap_04/images/,
#    patched Foundation markdown files with real S3 keys, updated DB mediaUrl
#    (2 body images required a second pass after fixing apostrophe encoding)
npx tsx scripts/generate-leap4-images.ts  # first pass: 18/20
npx tsx scripts/generate-leap4-images.ts  # second pass: 2/20 remaining

# 4. Course cover — generated leap4-foundation.png, saved to
#    raised-frontend/public/course-covers/, updated DB coverImageUrl
npx tsx scripts/generate-course-covers.ts
```

### DB records created

| Record type | ID |
|------------|-----|
| LearningCourse | `leap4-foundation` (order 3, minAge 9, maxAge 12) |
| LearningPhase | `leap4-foundation-phase` |
| LearningModule | `leap4-foundation-module` |
| LearningLesson x10 | `leap4-foundation-lesson-0` through `leap4-foundation-lesson-9` |

### Image files produced

- `raised-frontend/public/course-covers/leap4-foundation.png` (course card cover)
- `Leaps/Leap_04/images/l4-{slug}/hero-title-{uuid}.png` x10
- `Leaps/Leap_04/images/l4-{slug}/body-opening-{uuid}.png` x10
- All 20 images also live on S3 at `learning/raised-logic/l4-{slug}/`

### generate-course-covers.ts updated

Added the `leap4-foundation` job to `raised-backend/scripts/generate-course-covers.ts` so it is included in future re-runs alongside Leaps 1, 2, and 3.
