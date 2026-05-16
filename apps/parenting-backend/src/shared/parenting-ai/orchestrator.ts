import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/index.js";
import { detectLanguage, detectEmergencyRules, classifyIntent } from "./classifier.js";
import { getSessionMemory, getLongTermMemory, saveLongTermMemory } from "./memory.js";
import { parseTask, executeTask } from "./tasks.js";
import { performRetrieval } from "./retrieval.js";
import { generateResponse } from "./generator.js";
import { SYSTEM_PROMPTS } from "./constants.js";
import { ParentingContext, Task } from "./types.js";

type OrchestratorOptions = {
  userId: string;
  conversationId: string;
  message: string;
  onStream: (chunk: string) => void;
  onStatus: (status: string) => void;
};

export async function orchestrateFlow(opts: OrchestratorOptions) {
  const { userId, conversationId, message, onStream, onStatus } = opts;

  const saveAssistantMessage = async (payload: {
    content: string;
    locale: string;
    flagged?: boolean;
    citations?: Prisma.InputJsonValue;
  }) => {
    try {
      await prisma.message.create({
        data: {
          id: nanoid(),
          conversationId,
          role: "assistant",
          content: payload.content,
          locale: payload.locale,
          flagged: payload.flagged ?? false,
          citations: payload.citations,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        return;
      }
      throw error;
    }
  };

  let language = detectLanguage(message);
  const { detected: isEmergency } = detectEmergencyRules(message);

  if (isEmergency) {
    const emergencyMsg = SYSTEM_PROMPTS.EMERGENCY;
    onStream(emergencyMsg);
    await saveAssistantMessage({ content: emergencyMsg, locale: language, flagged: true });
    return;
  }

  onStatus("loading_context");

  const [sessionMem, longTermMem] = await Promise.all([
    getSessionMemory(conversationId),
    getLongTermMemory(userId),
  ]);

  onStatus("classifying");
  const classification = await classifyIntent(message, sessionMem.recentMessages);
  const intent = classification.intent;

  if (classification.language && classification.language !== "en") {
    language = classification.language;
  } else if (classification.language === "en") {
    language = "en";
  }

  if (intent === "unrelated") {
    const unrelatedMsg =
      language === "fa"
        ? "متأسفانه من فقط می‌توانم در مورد سؤالات مربوط به فرزندپروری کمک کنم. آیا سؤال دیگری در مورد فرزندپروری دارید؟"
        : "I'm a parenting assistant and can only help with questions related to raising children, child development, and family matters. Is there anything about parenting I can help you with?";
    onStream(unrelatedMsg);
    await saveAssistantMessage({
      content: unrelatedMsg,
      locale: language,
      citations: { intent: "unrelated", rejected: true } as Prisma.InputJsonValue,
    });
    return;
  }

  let parsedTask: Task | undefined;
  let expertDocs: string[] = [];
  let communityDocs: string[] = [];

  const context: ParentingContext = {
    conversationId,
    userId,
    userLocale: language,
    inputs: { message, detectedLanguage: language },
    classification: { intent, emergencyDetected: false, needsClarification: false },
    memory: { session: sessionMem, longTerm: longTermMem },
    rag: { expert: [], community: [] },
  };

  if (intent === "task") {
    onStatus("processing_task");
    const parsed = await parseTask(message, context);
    if (parsed?.type) {
      parsedTask = parsed;
      parsed.confirmed = true;
      const result = await executeTask(userId, parsed);
      if (result.success) {
        context.task = parsed;
        context.rag.expert.push(`SYSTEM NOTE: Task ${parsed.type} executed successfully: ${result.result}`);
      } else {
        context.rag.expert.push(`SYSTEM NOTE: Task execution failed: ${result.error}`);
      }
    }
  } else if (intent === "parenting" || intent === "safety" || intent === "emotional") {
    onStatus("retrieving_knowledge");

    const [docs, articleSearchResult] = await Promise.all([
      performRetrieval(message, language),
      executeTask(userId, { type: "search_articles", parameters: { query: message }, confirmed: true }),
    ]);

    expertDocs = docs.expert;
    communityDocs = docs.community;

    if (
      articleSearchResult.success &&
      articleSearchResult.result &&
      !articleSearchResult.result.includes("I couldn't find")
    ) {
      expertDocs.unshift(`COMMUNICATE THESE ARTICLE LINKS TO THE USER:\n${articleSearchResult.result}`);
    }

    context.rag = { expert: expertDocs, community: communityDocs };
  }

  onStatus("generating_response");
  const responseText = await generateResponse(context, onStream);

  await saveAssistantMessage({
    content: responseText,
    locale: language,
    citations: {
      intent,
      task: parsedTask ? parsedTask.type : null,
      ragCount: expertDocs.length + communityDocs.length,
    } as Prisma.InputJsonValue,
  });

  saveLongTermMemory(userId, message, conversationId).catch((error) => {
    console.error("Failed to save long-term memory", error);
  });
}
