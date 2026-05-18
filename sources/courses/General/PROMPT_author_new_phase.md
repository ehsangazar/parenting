# Prompt: Author Lesson Markdown for a New Phase

Copy this prompt when starting a new phase (e.g. Phase 2, Phase 3). Fill in the bracketed placeholders before running.

---

## Instructions

You are authoring lesson content for the **Raised** parenting app. Each lesson is rendered as a swipeable card deck in `LessonPlaybackPage`. Read `LESSON_CONTENT_SYSTEM.md` at the repo root before writing anything — it is the source of truth for card types, classification keywords, image rules, and S3 conventions.

### What to produce

Create one Markdown file per module for **[PHASE_NAME]** (e.g. `Lessons/Phase_2/M5_Title.md`). Follow the exact structure of `Lessons/Phase_1/M1_Welcome_to_Dev_Science.md` as your template.

### File structure per module

```
# Module N: Title
## Phase X: Phase Title

<!-- Module Outcome: one sentence -->

---

<!-- Raised lesson art: needle-felted wool diorama (chibi family, tactile fiber, stop-motion set). Style guide: ../../image-style-felted-dolls.md -->

---

### Introduction: [Intro Title]
<!--
  Images needed for this intro:
  - hero (mediaUrl, 16:9): [scene description]
  - body-1 (1:1): [scene description]
  - body-2 (1:1): [scene description]
  S3 prefix: learning/raised-logic/[module-slug]/
  Run: npx tsx scripts/generate-[module-slug]-images.ts
-->

[intro paragraph — becomes a key-insight or single-para prose card]


<!-- image-slot: body-1 — [scene description] -->
[paragraph paired with body-1 image]


<!-- image-slot: body-2 — [scene description] -->
[paragraph paired with body-2 image]

---

### Lesson N: [Title]
<!--
  Images needed:
  - hero (mediaUrl, 16:9): [scene description]
  - hook (1:1): [scene description]
  S3 prefix: learning/raised-logic/[lesson-slug]/
  Run: npx tsx scripts/generate-[module-slug]-images.ts
-->

**1. Hook / Paradox**
<!-- image-slot: hook — [scene description] -->
[hook text — rendered as prose card; image-slot comment is replaced by real S3 key when generate script runs]


**2. Myth Busting**
[myth text — red "× Myth" card; NO image]


**3. Paradigm Shift**
[truth/shift text — green "✓ Truth" card; optionally add a real image once generated]


**4. Edge Case**
"[quote text]" [explanation] — blue lead-quote card; NO image


**5. Micro-Action**
[action text — teal "✦ Try this" card; NO image]


**6. Philosophical Question**
[question text — white key-insight card; NO image]

---
```

Repeat the lesson block for every lesson in the module (typically 4–6 lessons).

### Card classification rules (summary)

| Label keyword in `**N. Label**` | Card type |
|---|---|
| `myth` | Red Myth card |
| `paradigm` / `truth` / `shift` | Green Truth card |
| `edge` / `case` | Blue Lead-Quote card |
| `micro` / `action` | Teal Action card |
| `question` / `philosophical` | White Key-Insight card |
| No matching keyword | Prose card |

**Double blank lines between every card block** — that is what splits the content into separate swipeable cards.

### Image rules

- **Hero image** (`LearningLesson.mediaUrl`): always one per lesson, 16:9, stored as raw S3 key.
- **Body images**: only in prose/hook blocks where a visual metaphor adds meaning. Myth, Truth, Edge, Action, and Question cards generally have **no image**.
- **Image + paragraph on same card**: use a **single newline** between `![alt](url)` and the paragraph — a double blank line would split them onto separate cards.
- **Ungenerated images**: use `<!-- image-slot: [description] -->` comment as placeholder. The generate script replaces it with the real markdown image reference.
- **S3 key pattern**: `learning/{course-slug}/{module-slug}/{image-slug}-{uuid}.png`
- Store raw S3 keys only — never presigned URLs.

### Image style

All images use the needle-felted diorama aesthetic. Read `image-style-felted-dolls.md` at the repo root for the full style anchor. Every image prompt = subject description + the STYLE constant from that file.

Characters follow the Raised family bible (chibi-style, minimalist features). Palette: muted sage, desaturated terracotta, deep indigo, oatmeal. No bright toy colors, no text in images.

### Content writing rules

- Each lesson must have exactly 6 numbered blocks: Hook/Paradox → Myth Busting → Paradigm Shift → Edge Case → Micro-Action → Philosophical Question.
- Hook/Paradox: a surprising tension or contradiction that makes the parent feel seen. Optional image.
- Myth Busting: one sentence stating the common myth. No image.
- Paradigm Shift: the scientific truth that replaces the myth. Can reference named researchers or studies. Optional image.
- Edge Case: a realistic objection in quotes, then a brief resolution. No image.
- Micro-Action: a specific, doable action a parent can take today or this week. No image.
- Philosophical Question: a single open question that lingers after the card is swiped. No image. Keep it under 140 characters — it renders as a Key-Insight card with large centered type.

### Naming conventions

| Asset | Convention |
|---|---|
| Markdown file | `Lessons/Phase_N/M{N}_{Title_Snake}.md` |
| Module S3 prefix | `learning/raised-logic/m{N}-{module-slug}/` |
| Lesson S3 prefix | `learning/raised-logic/m{N}-{lesson-slug}/` |
| Generate script | `raised-backend/scripts/generate-m{N}-images.ts` |

### Phase to author

**Phase:** [PHASE_NAME]
**Modules:** [list module titles and lesson titles here]
**Learning arc:** [describe what transformation the parent should experience across this phase]

Write the complete Markdown files for all modules in this phase now, following every convention above.
