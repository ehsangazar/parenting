import { franc } from "franc-min";
import { getOpenAI } from "./openai.js";
import { INTENTS, EMERGENCY_KEYWORDS } from "./constants.js";
import { IntentCategory } from "./types.js";

export function detectLanguage(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "en";

  const faPatterns = [
    /[کیپچگژ]/,
    /(سلام|خوب|چطور|هستم|مرسی|ممنون)/,
  ];
  if (faPatterns.some((p) => p.test(trimmed))) return "fa";

  const iso3 = franc(trimmed, { minLength: 3 });
  const map: Record<string, string> = {
    eng: "en", spa: "es", fra: "fr", deu: "de", ita: "it",
    por: "pt", nld: "nl", pol: "pl", tur: "tr", rus: "ru",
    zho: "zh", jpn: "ja", kor: "ko", tha: "th", heb: "he",
    arb: "ar", fas: "fa", pes: "fa", prs: "fa",
  };
  return map[iso3] ?? "en";
}

export function detectEmergencyRules(text: string): { detected: boolean; keyword?: string } {
  const lower = text.toLowerCase();
  const keyword = EMERGENCY_KEYWORDS.find((kw) => lower.includes(kw));
  return { detected: !!keyword, keyword };
}

export async function classifyIntent(
  text: string,
  history: Array<{ role: string; content: string }>,
): Promise<{ intent: IntentCategory; language: string }> {
  const client = getOpenAI();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Classify the user's intent into exactly one category and detect the language.

Intents:
- "greeting": Hello, hi, how are you.
- "parenting": Questions about raising kids, health, sleep, feeding, etc.
- "task": Explicit requests to do something (remind me, log this, schedule, find articles).
- "follow_up": References previous context like "what about that?" or "tell me more".
- "emotional": Venting, sad, happy, expressing feelings without a question.
- "safety": Urgent medical or safety concerns.
- "unrelated": Coding questions, sports, weather (unless parenting related).

Return JSON: { "intent": "category", "language": "ISO 2 code (en, es, fr, de, fa, etc)" }`,
      },
      ...history.slice(-3).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
  const intent = parsed.intent;
  const language = parsed.language ?? "en";

  if (INTENTS.includes(intent)) return { intent: intent as IntentCategory, language };
  return { intent: "parenting", language };
}
