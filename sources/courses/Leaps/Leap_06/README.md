# Leap 06 — The Symbolic Architect (19–24 Months)

Leap 06 covers the sixth developmental window, from approximately 19 to 24 months. The core theme is the **Symbolic Architect**: the brain's transition from purely physical trial-and-error to internal mental representation, culminating in the toddler's ability to think, plan, and communicate symbolically.

## Directory Structure

```
Leap_06/
├── Foundation/          # Lesson markdown files (seeded to DB via seed-leap6.ts)
├── images/              # Source images for lessons (hero + body per lesson)
└── README.md
```

## Lesson Catalogue

| File | Lesson ID | Order | Title |
|------|-----------|------:|-------|
| `L6_0_0_Welcome.md` | `leap6-foundation-lesson-0` | 0 | Welcome: The Symbolic Architect |
| `L6_0_1_Mental_Representation.md` | `leap6-foundation-lesson-1` | 10 | Mental Representation: The Internal Simulator |
| `L6_0_2_Self_Recognition.md` | `leap6-foundation-lesson-2` | 20 | Self-Recognition: The I Am Moment |
| `L6_0_3_Bilateral_Integration.md` | `leap6-foundation-lesson-3` | 30 | Bilateral Integration: The Unified Brain |
| `L6_0_4_Syntax_Eruption.md` | `leap6-foundation-lesson-4` | 40 | Syntax Eruption: The Grammar Engine |
| `L6_0_5_Symbolic_Play.md` | `leap6-foundation-lesson-5` | 50 | Symbolic Play: The As-If Mind |
| `L6_0_6_Categorical_Logic.md` | `leap6-foundation-lesson-6` | 60 | Categorical Logic: The Filing System |
| `L6_0_7_Anticipation_Window.md` | `leap6-foundation-lesson-7` | 70 | Anticipation Window: Getting Ahead of Reality |
| `L6_0_8_Sensory_Readiness.md` | `leap6-foundation-lesson-8` | 80 | Sensory Readiness: The Internal Map |
| `L6_0_9_Domestic_Stewardship.md` | `leap6-foundation-lesson-9` | 90 | Domestic Stewardship: The Contributing Hand |
| `L6_0_GP_Growth_Profile.md` | `leap6-foundation-lesson-10` | 100 | Growth Profile: The Symbolic Architect |

### Why the ×10 order scale?

The DB `order` field is an integer. Using multiples of 10 (0, 10, 20 … 100) leaves room for split "b" variants at `base×10 + 5` without renumbering existing lessons.

## File Format

Each lesson `.md` file follows this structure:

```markdown
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

## Images

Each lesson requires two images, stored locally in `images/{slug}/` and served from the CDN at `learning/raised-logic/{slug}/`.

| Pattern | Role | Referenced via |
|---------|------|----------------|
| `hero-title-{uuid}.png` | Thumbnail in the path node popup and lesson header | `<!-- hero: learning/raised-logic/{slug}/hero-title-{uuid}.png -->` comment |
| `body-opening-{uuid}.png` | Inline image in the first scroll of content | `![alt text](learning/raised-logic/{slug}/body-opening-{uuid}.png)` |

Before images are generated, files use placeholder comments:
- Hero: `<!-- hero-todo: l6-{slug} -->`
- Body: `<!-- image-slot: body — {description} -->`

## Syncing to the Database

```bash
# First-time seed — creates all DB records (course, phase, module, lessons)
cd raised-backend && npx tsx scripts/seed-leap6.ts

# Content sync — updates content/mediaUrl/title on existing records only
cd raised-backend && npx tsx scripts/sync-leap6-to-db.ts

# Dry-run preview
cd raised-backend && npx tsx scripts/sync-leap6-to-db.ts --dry-run

# Generate images (requires seed to have run first)
cd raised-backend && npx tsx scripts/generate-leap6-images.ts --dry-run
cd raised-backend && npx tsx scripts/generate-leap6-images.ts
```

## Naming Convention

```
L{leap}_{module}_{order}_{SlugTitle}.md       # standard lesson
L{leap}_{module}_{order}b_{SlugTitle}.md      # split part B
L{leap}_{module}_GP_{SlugTitle}.md            # Growth Profile
L{leap}_{module}_GPb_{SlugTitle}.md           # Growth Profile part B
```

## DB Records

| Record type | ID |
|------------|-----|
| LearningCourse | `leap6-foundation` (order 5, minAge 19, maxAge 24) |
| LearningPhase | `leap6-foundation-phase` |
| LearningModule | `leap6-foundation-module` |
| LearningLesson x11 | `leap6-foundation-lesson-0` through `leap6-foundation-lesson-10` |
