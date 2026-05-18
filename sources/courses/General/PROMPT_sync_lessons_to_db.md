# Prompt: Sync Phase 1 Lesson Markdown to Database

Use this prompt to instruct an agent (or yourself) to write and run the DB sync scripts for Phase 1 lessons.

---

## Context

The Raised app stores lesson content in a PostgreSQL database via Prisma. The schema is in `raised-backend/prisma/schema.prisma`. The relevant model is `LearningLesson`:

```
LearningLesson {
  id        String
  title     String
  content   String   // card blocks separated by \n\n (double blank line)
  mediaUrl  String?  // raw S3 key for hero image (never presigned)
  mediaType String?  // "image"
  moduleId  String
  order     Int
  ...
}
```

The canonical source of truth for content is the Markdown files in `Lessons/Phase_1/`. They have already been structured for the card system — **double blank lines between every card block**, labeled blocks with classification keywords, and `<!-- hero: -->` / `<!-- image-slot: -->` comments.

---

## What needs to happen

### 1. Locate existing LearningLesson records

Run a Prisma query (or check the seed script at `raised-backend/prisma/seed.ts` or `raised-backend/scripts/seed-lessons.ts`) to find all `LearningLesson` records for Phase 1 modules:

- Module 1: Welcome to Developmental Science (6 lessons + 1 intro)
- Module 2: The Gardener's Logic (4 lessons + 1 intro)
- Module 3: The Spider Web / The 5 Domains (3 lessons + 1 intro)
- Module 4: The Role of Parents and Caregivers (6 lessons + 1 intro)

Use lesson `title` to match records. If a record doesn't exist, create it via seed.

### 2. Extract card content from Markdown

For each `### Lesson N: Title` section in the Markdown file, extract the card blocks as follows:

- Strip the `### Lesson N: Title` heading line (this is the lesson `title`, not card content).
- Strip all HTML comment lines (`<!-- ... -->`).
- Strip `<!-- image-slot: ... -->` placeholder comment lines (these have no generated image yet).
- Join remaining blocks with `\n\n` — each block separated by a double blank line becomes one card.
- The result is the `content` string to store in `LearningLesson.content`.

**Card splitting rule (used by the frontend):** `content.split(/\n\n+/)` — any two or more consecutive blank lines = card boundary.

### 3. Handle hero images

- If the lesson already has a valid `mediaUrl` (raw S3 key), do not overwrite it.
- If the Markdown has a `<!-- hero: learning/raised-logic/... -->` comment with a real S3 key (not a TODO), use it.
- If the hero is marked `<!-- hero: TODO -->`, leave `mediaUrl` null — it will be set by the image generation script.

### 4. Write a sync script

Create `raised-backend/scripts/sync-phase1-lessons.ts` following the pattern of `raised-backend/scripts/generate-m1-intro-images.ts`.

The script must:

1. **Read** each Markdown file from `Lessons/Phase_1/`.
2. **Parse** lesson sections by splitting on `\n---\n` and matching `### Lesson` headers.
3. **Extract** content per the rules above (strip comments, join blocks).
4. **Find** the matching `LearningLesson` by title using `prisma.learningLesson.findFirst({ where: { title } })`.
5. **Update** `content` (and `mediaUrl`/`mediaType` if a real S3 key is present).
6. **Log** each update: lesson title, character count, whether mediaUrl was set.
7. **Dry-run flag**: support `--dry-run` CLI argument to log changes without writing.

### 5. Run the script

```bash
cd raised-backend

# Dry run first — verify output
npx tsx scripts/sync-phase1-lessons.ts --dry-run

# Apply
npx tsx scripts/sync-phase1-lessons.ts
```

Required env vars (already in `.env`): `DATABASE_URL`.

### 6. Verify

After running, spot-check 2–3 lessons in the app or via Prisma Studio:

```bash
cd raised-backend && npx prisma studio
```

Confirm:
- `content` is not empty.
- Cards split correctly (count `\n\n` separators — should equal `number_of_cards - 1`).
- `mediaUrl` is a raw S3 key (no `https://` prefix).
- `mediaType` is `"image"` when `mediaUrl` is set.

---

## Notes on content that still needs images

M3 and M4 lesson Markdown files use `<!-- image-slot: ... -->` placeholder comments instead of real `![alt](s3-key)` image references. These placeholders are stripped during sync, so the cards will render as text-only prose until image generation scripts are run.

To generate images for M3 and M4:
1. Create `raised-backend/scripts/generate-m3-images.ts` following the pattern of `generate-m1-intro-images.ts`.
2. Define one `IMAGES` entry per `<!-- image-slot: -->` comment in the Markdown, using the scene description in the comment as the image subject.
3. Use the Gemini API (preferred) or DALL·E 3 (fallback) — see `LESSON_CONTENT_SYSTEM.md` §6 for the exact API call pattern.
4. After generation, the script updates `LearningLesson.content` with the real `![alt](s3-key)` references and syncs the Markdown file.

Required env vars for image generation: `GEMINI_API_KEY` (or `OPENAI_API_KEY`), `S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.

---

## File reference

| File | Purpose |
|---|---|
| `Lessons/Phase_1/M1_Welcome_to_Dev_Science.md` | M1 content source (has real S3 image keys) |
| `Lessons/Phase_1/M2_Gardeners_Logic.md` | M2 content source (has real S3 image keys) |
| `Lessons/Phase_1/M3_The_5_Domains.md` | M3 content source (image-slot placeholders) |
| `Lessons/Phase_1/M4_The_Role_of_Parents_and_Caregivers.md` | M4 content source (image-slot placeholders) |
| `raised-backend/scripts/generate-m1-intro-images.ts` | Reference implementation for generate scripts |
| `raised-backend/prisma/seed.ts` | Lesson seeding — check for existing lesson IDs |
| `LESSON_CONTENT_SYSTEM.md` | Card system spec — read before touching content |
