# Leaps — Developmental Learning Modules

This directory contains all developmental leap content for the Raised app. Each `Leap_XX/` directory follows the same structure and maps to a course in the database.

## Leap Index

| Leap | Age Range | Theme | Status |
|------|-----------|-------|--------|
| Leap 01 | 0–3 months | The Great Adjustment (Extrauterine Adjustment) | Complete |
| Leap 02 | 3–6 months | The Birth of Intentional Agency | Complete |
| Leap 03–15 | — | — | Content pending |

## Directory Structure Per Leap

```
Leap_XX/
├── Foundation/          # Lesson markdown files
├── images/              # Local copies of generated images (hero + body per lesson)
└── README.md            # Leap-specific catalogue and documentation
```

## Lesson File Format

Each `.md` file in `Foundation/` follows this exact structure:

```markdown
<!-- Source: Author (Year) p. XX: Chapter/Topic -->

<!-- hero: learning/raised-logic/{slug}/hero-title-{uuid}.png -->

{Opening scene — 1-2 sentences placing the parent in a recognizable moment}

![{Alt text}](learning/raised-logic/{slug}/body-opening-{uuid}.png)

{Science paragraph — developmental mechanism with **bold key terms**}

**{Actionable Tip Title}**
{1-2 sentences of practical guidance}

**{Actionable Tip Title}**
{1-2 sentences of practical guidance}

**{Actionable Tip Title}**
{1-2 sentences of practical guidance}

{Closing affirmation — 1-2 sentences reframing the parent's role}

---
```

### Content Rules

- **Target:** 350–480 words per lesson
- **Max:** ~500 words of dense prose (no tip breaks) before splitting into a `b` variant
- All lessons are within 315–400 words; check before adding new content
- Source: Bornstein (2014) — *Handbook of Parenting, Vol. 2*
- No em dashes anywhere in content

### Image Placeholders (before generation)

Before images are generated, use these placeholder comments in the markdown:

```markdown
<!-- hero-todo: l{N}-{slug} -->
<!-- image-slot: body — {description of scene for Gemini prompt} -->
```

After generation, these are replaced with actual paths:

```markdown
<!-- hero: learning/raised-logic/{slug}/hero-title-{uuid}.png -->
![alt text](learning/raised-logic/{slug}/body-opening-{uuid}.png)
```

## Naming Convention

```
L{leap}_{module}_{order}_{SlugTitle}.md       # standard lesson
L{leap}_{module}_{order}b_{SlugTitle}.md      # split part B
L{leap}_{module}_GP_{SlugTitle}.md            # Growth Profile
L{leap}_{module}_GPb_{SlugTitle}.md           # Growth Profile part B
```

Order uses a x10 scale (0, 10, 20 ... 90). Split "b" variants use `base×10+5` (e.g. order 15 for a split of lesson 1).

## DB ID Conventions

| File pattern | Lesson ID | Order |
|---|---|---|
| `LN_0_0_...` | `leapN-foundation-lesson-0` | 0 |
| `LN_0_1_...` | `leapN-foundation-lesson-1` | 10 |
| `LN_0_Nb_...` | `leapN-foundation-lesson-Nb` | N×10+5 |
| `LN_0_GP_...` | `leapN-foundation-lesson-9` | 90 |
| `LN_0_GPb_...` | `leapN-foundation-lesson-9b` | 95 |

Course ID: `leapN-foundation`
Phase ID: `leapN-foundation-phase`
Module ID: `leapN-foundation-module`

## Image Style

All images use this style anchor (Waldorf Garden palette, needle-felted chibi aesthetic):

> Needle-felted wool sculpture, 3D fiber art, hand-crafted felt miniature. Chibi style, stylized 3D characters, minimalist facial features. Luminous low-pigment wool. Ultra-pastel Waldorf Garden palette: very pale terracotta clay (#D4A08A), desaturated grey-sage (#C2CEAF), ultra-pale powder-blue sky (#D3E4EE), warm cream linen (#F5ECD7), light kraft tan (#D4C4A8), pale dusty rose (#E0C4C4), warm white (#FDFAF5). Hand-crafted diorama, stop-motion aesthetic. Macro photography, soft diffused lighting, shallow depth of field, tilt-shift. Ethereally light, airy, cheerful, sunlit. No text. Wide 16:9 landscape composition.

- **Hero images:** Wide panoramic diorama, full-bleed 16:9
- **Body images:** Scene illustration matching the opening paragraph
- Model: `gemini-2.5-flash-image` (set via `GEMINI_IMAGE_MODEL` env var)
- Stored locally in `images/{slug}/` and served from S3 CDN at `learning/raised-logic/{slug}/`

## Adding a New Leap — Step-by-Step

### 1. Create the markdown files

```
Leaps/Leap_XX/
├── Foundation/
│   ├── LX_0_0_Welcome_Leap_XX.md
│   ├── LX_0_1_FirstLesson.md
│   ├── ...
│   └── LX_0_GP_Summary_Leap_XX.md
└── README.md
```

Each file should have the correct `<!-- hero-todo: ... -->` and `<!-- image-slot: body — ... -->` placeholders before image generation.

### 2. Create backend scripts (copy from Leap_02, update N)

```
raised-backend/scripts/
├── seed-leapN.ts           # creates DB records (course, phase, module, lessons)
├── sync-leapN-to-db.ts     # syncs content/titles from markdown to DB
└── generate-leapN-images.ts # generates images via Gemini, uploads to S3, patches markdown
```

Key things to update in each script:
- `LEAP{N}_DIR` path
- Course/phase/module IDs (`leapN-foundation`, `leapN-foundation-phase`, `leapN-foundation-module`)
- `minAgeMonths` / `maxAgeMonths` on the module upsert
- Course `order` (Leap 1 = 0, Leap 2 = 1, Leap 3 = 2, ...)
- `CLEAN_TITLES` map in the sync script
- `JOBS` array in the image script (one hero + one body job per lesson)
- `LESSON_ID` map in the image script
- File path constants at the top of the image script

### 3. Run in order

```bash
cd raised-backend

# 1. Create DB records
npx tsx scripts/seed-leapN.ts

# 2. Sync titles and content
npx tsx scripts/sync-leapN-to-db.ts

# 3. Generate images, patch markdown, update DB
npx tsx scripts/generate-leapN-images.ts --dry-run   # preview first
npx tsx scripts/generate-leapN-images.ts             # run for real
```

### 4. Update Leap_XX/README.md

Each leap's README should document:
- The lesson catalogue (file, lesson ID, order, title)
- The age range
- The developmental theme

### 5. Update this file

Add the new leap to the Leap Index table at the top of this README.

## Age Range Reference

| Leap | Min Months | Max Months |
|------|-----------|-----------|
| 01 | 0 | 3 |
| 02 | 3 | 6 |
| 03 | 6 | 9 |
| 04 | 9 | 12 |
| 05 | 12 | 15 |
| 06 | 15 | 18 |
| 07 | 18 | 24 |
| 08 | 24 | 30 |
| 09 | 30 | 36 |
| 10 | 36 | 42 |
| 11 | 42 | 48 |
| 12 | 48 | 54 |
| 13 | 54 | 60 |
| 14 | 60 | 66 |
| 15 | 66 | 72 |
