# Leap 03 — The Vertical Pillar (6–9 Months)

Leap 03 covers the third developmental window, from approximately six to nine months. The core theme is **The Vertical Pillar**: the brain's transition from horizontal floor-dweller to upright social agent, culminating in independent sitting, first crawling, proto-imperative pointing, and the birth of joint attention.

## Directory Structure

```
Leap_03/
├── Foundation/          # Lesson markdown files (seeded to DB via seed-leap3.ts)
├── images/              # Source images for lessons (hero + body per lesson)
└── README.md
```

## Lesson Catalogue

| File | Lesson ID | Order | Title |
|------|-----------|------:|-------|
| `L3_0_0_Welcome.md` | `leap3-foundation-lesson-0` | 0 | Welcome: The Vertical Pillar |
| `L3_0_1_Hidden_Permanence.md` | `leap3-foundation-lesson-1` | 10 | Object Permanence: The Hidden World |
| `L3_0_2_The_Persistent_Mind.md` | `leap3-foundation-lesson-2` | 20 | The Persistent Mind: Goal-Directed Behavior |
| `L3_0_3_The_Gravity_Lab.md` | `leap3-foundation-lesson-3` | 30 | The Gravity Lab: Causal Reasoning |
| `L3_0_4_The_Ground_Navigator.md` | `leap3-foundation-lesson-4` | 40 | The Ground Navigator: First Crawl |
| `L3_0_5_The_Vertical_Pillar.md` | `leap3-foundation-lesson-5` | 50 | The Vertical Pillar: Independent Sitting |
| `L3_0_6_The_Precise_Weaver.md` | `leap3-foundation-lesson-6` | 60 | The Precise Weaver: Radial-Digital Grasp |
| `L3_0_7_The_Pointing_Finger.md` | `leap3-foundation-lesson-7` | 70 | The Pointing Finger: Pre-verbal Communication |
| `L3_0_8_Shared_Mind.md` | `leap3-foundation-lesson-8` | 80 | Shared Mind: The Birth of Joint Attention |
| `L3_0_9_The_Safety_Filter.md` | `leap3-foundation-lesson-9` | 90 | The Safety Filter: Stranger Wariness |
| `L3_0_GP_Growth_Profile.md` | `leap3-foundation-lesson-10` | 100 | Growth Profile: The Nine-Month Consolidation |

### Why lesson-10 for the Growth Profile?

Leap 03 has numeric lessons 0–9 (10 lessons), so the Growth Profile maps to lesson-10 at order 100. This differs from Leap 02 where GP was lesson-9 (only 9 numeric lessons, 0–8). The ×10 order scale still applies, leaving room for split "b" variants at base×10+5.

## Syncing to the Database

```bash
# First-time seed — creates all DB records (course, phase, module, lessons)
cd raised-backend && npx tsx scripts/seed-leap3.ts

# Content sync — updates content/mediaUrl/title on existing records only
cd raised-backend && npx tsx scripts/sync-leap3-to-db.ts

# Dry-run preview
cd raised-backend && npx tsx scripts/sync-leap3-to-db.ts --dry-run

# Generate images (requires seed to have run first)
cd raised-backend && npx tsx scripts/generate-leap3-images.ts --dry-run
cd raised-backend && npx tsx scripts/generate-leap3-images.ts
```

## Build Log (2026-05-04)

### Scripts run (in order)

```bash
cd raised-backend

# 1. Seed DB — created course, phase, module, and 11 lesson records
npx tsx scripts/seed-leap3.ts

# 2. Sync — wrote cleaned content and clean titles to all 11 lessons
npx tsx scripts/sync-leap3-to-db.ts

# 3. Images — generated 22 images (1 hero + 1 body per lesson),
#    uploaded to S3, saved local copies to Leaps/Leap_03/images/,
#    patched Foundation markdown files with real S3 keys, updated DB mediaUrl
npx tsx scripts/generate-leap3-images.ts

# 4. Course cover — generated leap3-foundation.png, saved to
#    raised-frontend/public/course-covers/, updated DB coverImageUrl
npx tsx scripts/generate-course-covers.ts
```

### DB records created

| Record type | ID |
|------------|-----|
| LearningCourse | `leap3-foundation` (order 2, minAge 6, maxAge 9) |
| LearningPhase | `leap3-foundation-phase` |
| LearningModule | `leap3-foundation-module` |
| LearningLesson x11 | `leap3-foundation-lesson-0` through `leap3-foundation-lesson-10` |

### Image files produced

- `raised-frontend/public/course-covers/leap3-foundation.png` (course card cover)
- `Leaps/Leap_03/images/l3-{slug}/hero-title-{uuid}.png` x11
- `Leaps/Leap_03/images/l3-{slug}/body-opening-{uuid}.png` x11
- All 22 images also live on S3 at `learning/raised-logic/l3-{slug}/`

### generate-course-covers.ts updated

Added the `leap3-foundation` job to `raised-backend/scripts/generate-course-covers.ts` so it is included in future re-runs alongside Leap 1 and Leap 2.
