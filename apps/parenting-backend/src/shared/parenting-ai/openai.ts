import OpenAI from "openai";
import { env } from "../../config/env.js";

let client: OpenAI | undefined;

export const getOpenAI = () => {
  if (!client) {
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
};

export const embedText = async (input: string): Promise<number[]> => {
  const oai = getOpenAI();
  const res = await oai.embeddings.create({ model: "text-embedding-3-large", input });
  return res.data[0]?.embedding ?? [];
};
