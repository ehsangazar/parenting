import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import { getOpenAI } from "./openai.js";
import { ParentingContext } from "./types.js";

export async function generateResponse(
  context: ParentingContext,
  streamCallback: (chunk: string) => void,
): Promise<string> {
  const client = getOpenAI();

  const systemPrompt = `
You are a calm, experienced parenting expert AI.

Language: Respond in ${context.inputs.detectedLanguage} (Locale: ${context.userLocale}).

CRITICAL FORMATTING RULES:
- Use proper Markdown formatting with clear structure
- Start with a brief intro paragraph
- Use ### headings to organize main topics
- Use bullet points (- or *) for lists - ALWAYS put each item on a new line
- Add TWO blank lines between sections
- Add ONE blank line between paragraphs
- Keep paragraphs short (2-3 sentences max)
- NEVER write long run-on text blocks

Tone: Empathetic, professional, non-judgmental.

User Context:
- Long-Term Memory: ${JSON.stringify(context.memory.longTerm)}
- Session Context: ${JSON.stringify(context.memory.session)}

RAG Information:
- Expert Knowledge (Prioritize this):
${context.rag.expert.join("\n\n")}

- Community Experience (Secondary, anecdotal):
${context.rag.community.join("\n\n")}

Instructions:
1. Answer the user's question using the provided RAG context.
2. If expert vs community info conflicts, side with expert but acknowledge community views if safe.
3. Be concise but warm - use short paragraphs and clear structure.
4. If a task was executed, confirm it clearly.
5. If information is missing, ask clarifying questions (limit to 1).
6. Do NOT mention "RAG" or "Docs". Say "experts recommend" or "parents often find".
7. IF "ARTICLE LINKS" are provided in the Expert Knowledge, ALWAYS list them clearly at the end under a "Recommended Reading" heading.

Current Intent: ${context.classification.intent}
`;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...context.memory.session.recentMessages,
    { role: "user", content: context.inputs.message },
  ];

  const stream = await client.chat.completions.create({
    model: "gpt-4o",
    messages,
    stream: true,
    temperature: 0.5,
  });

  let fullResponse = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content ?? "";
    if (content) {
      fullResponse += content;
      streamCallback(content);
    }
  }

  return fullResponse;
}
