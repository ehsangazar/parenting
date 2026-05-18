import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from "openai/resources/chat/completions.js";
import { getOpenAI } from "./openai.js";
import { OPENAI_TOOLS, TOOLS_BY_NAME } from "./tools/index.js";
import type { ToolContext, NavCard, Card, ToolResult } from "./tools/types.js";

export type ToolLoopCallbacks = {
  onStream: (chunk: string) => void;
  onStatus: (status: string) => void;
  onToolStart: (payload: { name: string; label: string; args: unknown }) => void;
  onToolFinish: (payload: { name: string; ok: boolean; summary: string }) => void;
  onNavCard: (card: NavCard) => void;
  onCard: (card: Card) => void;
};

const MAX_ITERATIONS = 5;
const MODEL = "gpt-4o";

export async function runToolLoop(
  systemPrompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  ctx: ToolContext,
  cbs: ToolLoopCallbacks,
): Promise<{ finalText: string; navCards: NavCard[]; cards: Card[] }> {
  const client = getOpenAI();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const collectedNavCards: NavCard[] = [];
  const collectedCards: Card[] = [];

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: OPENAI_TOOLS,
      tool_choice: "auto",
      temperature: 0.5,
    });

    const choice = completion.choices[0];
    const msg = choice.message;

    const toolCalls = msg.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      const finalText = await streamFinalAnswer(messages, cbs.onStream);
      return { finalText, navCards: collectedNavCards, cards: collectedCards };
    }

    messages.push({
      role: "assistant",
      content: msg.content ?? "",
      tool_calls: toolCalls,
    });

    const results = await Promise.all(
      toolCalls.map((call) => executeToolCall(call, ctx, cbs)),
    );

    for (const { call, result } of results) {
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify({
          ok: result.ok,
          summary: result.summary,
          data: result.data ?? null,
          error: result.error ?? null,
        }),
      });
      if (result.navCards) {
        for (const c of result.navCards) {
          collectedNavCards.push(c);
          cbs.onNavCard(c);
        }
      }
      if (result.cards) {
        for (const c of result.cards) {
          collectedCards.push(c);
          cbs.onCard(c);
        }
      }
    }
    cbs.onStatus("generating_response");
  }

  const finalText = await streamFinalAnswer(messages, cbs.onStream);
  return { finalText, navCards: collectedNavCards, cards: collectedCards };
}

async function executeToolCall(
  call: ChatCompletionMessageToolCall,
  ctx: ToolContext,
  cbs: ToolLoopCallbacks,
): Promise<{ call: ChatCompletionMessageToolCall; result: ToolResult }> {
  const def = TOOLS_BY_NAME[call.function.name];
  let args: Record<string, unknown> = {};
  try {
    args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
  } catch {
    args = {};
  }

  if (!def) {
    cbs.onToolFinish({ name: call.function.name, ok: false, summary: "Unknown tool." });
    return {
      call,
      result: { ok: false, summary: `Unknown tool ${call.function.name}`, error: "unknown_tool" },
    };
  }

  const label = def.statusLabel ? def.statusLabel(args) : def.name;
  cbs.onToolStart({ name: def.name, label, args });

  try {
    const result = await def.execute(args, ctx);
    cbs.onToolFinish({ name: def.name, ok: result.ok, summary: result.summary });
    return { call, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    cbs.onToolFinish({ name: def.name, ok: false, summary: message });
    return { call, result: { ok: false, summary: message, error: "exception" } };
  }
}

async function streamFinalAnswer(
  messages: ChatCompletionMessageParam[],
  onStream: (chunk: string) => void,
): Promise<string> {
  const client = getOpenAI();
  const stream = await client.chat.completions.create({
    model: MODEL,
    messages,
    stream: true,
    temperature: 0.5,
  });

  let fullResponse = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content ?? "";
    if (content) {
      fullResponse += content;
      onStream(content);
    }
  }
  return fullResponse;
}
