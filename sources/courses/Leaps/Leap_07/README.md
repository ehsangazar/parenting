# Leap 07 — The Narrative Boundary (25–30 Months)

Leap 07 covers the seventh developmental window, from approximately 25 to 30 months. The core theme is the **Narrative Boundary**: the brain's transition from a collection of symbolic facts into a landscape of subjectivity, culminating in the toddler's emergence as the central protagonist of their own personal story.

## Directory Structure

```
Leap_07/
├── Foundation/          # Lesson markdown files (seeded to DB via seed-leap7.ts)
├── images/              # Source images for lessons (hero + body per lesson)
└── README.md
```

## Lesson Catalogue

| File | Lesson ID | Order | Title |
|------|-----------|------:|-------|
| `L7_0_0_Welcome.md` | `leap7-foundation-lesson-0` | 0 | Welcome: The Narrative Boundary |
| `L7_0_1_Subjective_Pivot.md` | `leap7-foundation-lesson-1` | 10 | Subjective Pivot: I, You, Me |
| `L7_0_2_Narrative_Onset.md` | `leap7-foundation-lesson-2` | 20 | Narrative Onset: Connecting the Dots |
| `L7_0_3_Inquiry_Engine.md` | `leap7-foundation-lesson-3` | 30 | Inquiry Engine: The Why Phase |
| `L7_0_4_Numerical_Logic.md` | `leap7-foundation-lesson-4` | 40 | Numerical Logic: The Concept of Two |
| `L7_0_5_Scripted_Play.md` | `leap7-foundation-lesson-5` | 50 | Scripted Play: The Multistep Arc |
| `L7_0_GP_Growth_Profile.md` | `leap7-foundation-lesson-6` | 60 | Growth Profile: The Narrative Mind |

Leap 7 has 6 numeric lessons (0-5), so GP maps to lesson-6 at order 60.

## Syncing to the Database

```bash
# First-time seed — creates all DB records (course, phase, module, lessons)
cd raised-backend && npx tsx scripts/seed-leap7.ts

# Content sync — updates content/mediaUrl/title on existing records only
cd raised-backend && npx tsx scripts/sync-leap7-to-db.ts

# Dry-run preview
cd raised-backend && npx tsx scripts/sync-leap7-to-db.ts --dry-run

# Generate images (requires seed to have run first)
cd raised-backend && npx tsx scripts/generate-leap7-images.ts --dry-run
cd raised-backend && npx tsx scripts/generate-leap7-images.ts
```

## DB Records

| Record type | ID |
|------------|-----|
| LearningCourse | `leap7-foundation` (order 6, minAge 25, maxAge 30) |
| LearningPhase | `leap7-foundation-phase` |
| LearningModule | `leap7-foundation-module` |
| LearningLesson x7 | `leap7-foundation-lesson-0` through `leap7-foundation-lesson-6` |
