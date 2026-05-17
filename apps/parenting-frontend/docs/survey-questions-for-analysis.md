# Raised Survey – Questions Reference for AI Analysis

Use this document to interpret survey response keys and question text when analyzing answers.

---

## Response keys and question definitions

### Part 1: Family Profile

| Key | Question | Type | Options / Scale |
|-----|----------|------|-----------------|
| `q1_familyStructure` | Which of the following best describes your family structure? | Single choice | Two-parent household, Single-parent household, Co-parenting (parents live in separate households), Guardian / Other |
| `q1_familyStructure_other` | (When "Guardian / Other" selected) Please describe | Free text | — |
| `q2_children` | How many children do you have? | Single choice | 1, 2, 3 or more |
| `q3_childAges` | Ages of your children (select all that apply). Select all stages that apply to your family. | Multiple choice | Pregnancy, 0–12 months, 1–3 years, 4–5 years, 6–12 years, 13–18 years, 18+ years |

---

### Part 2: Finding Parenting Answers

| Key | Question | Type | Options / Scale |
|-----|----------|------|-----------------|
| `q4_trustDifficulty` | When you have a worrying parenting question, how difficult is it to find an answer you trust? | Scale 1–10 | 1 = Very easy / I have a trusted source → 10 = Extremely difficult or stressful |
| `q5_overwhelmed` | How often do you feel overwhelmed by conflicting parenting advice? | Scale 1–10 | 1 = Never / Rarely → 10 = All the time |
| `q6_adviceSources` | Where do you currently go for parenting advice? (Select all that apply) | Multiple choice | Google / Web search, Parenting apps or sites (e.g., Common Sense Media, Understood, BabyCenter), Social media (Facebook groups, Instagram, TikTok), Friends or family, Pediatrician / Healthcare provider, Books or blogs, Other |
| `q6_adviceSources_other` | (When "Other" selected) Please describe | Free text | — |
| `q7_frustration` | What's the most frustrating part of finding parenting advice online? | Free text | Optional |

---

### Part 3: Tools You Currently Use

| Key | Question | Type | Options / Scale |
|-----|----------|------|-----------------|
| `q8_currentApps` | Which of the following parenting-related apps or tools do you currently use? (Select all that apply) | Multiple choice | Feeding, sleep, or diaper tracker, Milestone or development tracker, Pregnancy tracker, Parenting community / forum app, Educational or learning apps for kids, Family calendar / organizer, None, Other |
| `q8_currentApps_other` | (When "Other" selected) Please describe | Free text | — |
| `q9_appSatisfaction` | How satisfied are you with the parenting apps you currently use? | Scale 1–10 | 1 = Not satisfied at all → 10 = Very satisfied. *(Only shown if "None" not selected in Q8.)* |
| `q10_appsMissing` | What's missing from the parenting apps you've tried? | Free text | *(Only shown if "None" not selected in Q8.)* |

---

### Part 4: Product Value & Features

| Key | Question | Type | Options / Scale |
|-----|----------|------|-----------------|
| `q11_unifiedValue` | How valuable would a unified app be that combines tracking, advice, and community in one place? | Scale 1–10 | 1 = Not valuable → 10 = Extremely valuable |
| `q12_modularity` | How important is it that the app grows with your child (from pregnancy through school age and beyond)? | Scale 1–10 | 1 = Not important → 10 = Very important |
| `q13_audioLogging` | How interested would you be in an audio logging feature (voice notes for memories, milestones, or questions)? | Scale 1–10 | 1 = Not interested → 10 = Very interested |
| `q14_topFeatures` | Which features would be most valuable to you? (Select your top 3) | Multiple choice | Personalized, evidence-based answers to parenting questions, Milestone tracking with developmental insights, Community of parents with children of similar ages, Expert-reviewed content (pediatricians, child psychologists), Daily tips tailored to my child's age, Family calendar and task management, Audio journaling for memories, None / No specific features, Other |
| `q14_topFeatures_other` | (When "Other" selected) Please describe | Free text | — |

---

### Part 5: Development & Learning

| Key | Question | Type | Options / Scale |
|-----|----------|------|-----------------|
| `q15_milestoneConcern` | How concerned are you about your child's developmental milestones? | Scale 1–10 | 1 = Not concerned → 10 = Very concerned |
| `q16_developmentFrequency` | How often do you look up information about child development? | Single choice | Daily, A few times a week, Once a week, A few times a month, Rarely |
| `q17_researchTopics` | What topics do you research most? (Select all that apply) | Multiple choice | Education and learning activities, Social and emotional development, Behavior and discipline, Developmental milestones, Health and safety, Screen time / digital wellness, Sleep, Feeding / Nutrition, Other |
| `q17_researchTopics_other` | (When "Other" selected) Please describe | Free text | — |

---

### Part 6: Pricing & Mission

| Key | Question | Type | Options / Scale |
|-----|----------|------|-----------------|
| `q18_willingToPay` | Would you pay for a premium parenting app if it saved you time and reduced stress? | Single choice | Yes, definitely, Yes, if it's affordable, Maybe, depends on features, No, I prefer free apps |
| `q19_pricePoint` | What would you consider a fair monthly price for a comprehensive parenting app? | Single choice | Free (ad-supported), $1 - $5/month, $5 - $10/month, $10 - $15/month, $15 - $20/month, More than $20/month |
| `q20_parentBuilt` | How important is it that the app is built by parents, for parents? | Scale 1–10 | 1 = Not important → 10 = Very important |

---

### Part 7: Closing

| Key | Question | Type | Options / Scale |
|-----|----------|------|-----------------|
| `q21_expertQuestion` | If you could ask one question to a parenting expert right now, what would it be? | Free text | Optional |
| `q22_additionalFeedback` | Any other thoughts, ideas, or feedback you'd like to share? | Free text | Optional |
| `q23_email` | Email (optional - if you'd like early access or updates) | Free text | Optional |

---

## Notes for analysis

- **Scale questions (1–10):** Stored as numbers. Higher = more of the right-hand label (e.g. more difficult, more valuable).
- **Single choice:** One string value from the options list.
- **Multiple choice:** Array of strings (one or more options).
- **Free text:** String; may be empty if optional or skipped.
- **Conditional questions:** `q9_appSatisfaction` and `q10_appsMissing` are only shown when "None" is not selected in `q8_currentApps`; they may be absent in responses.
- **"_other" keys:** When the respondent selects "Other", the free-text clarification is in the corresponding `*_other` key.
