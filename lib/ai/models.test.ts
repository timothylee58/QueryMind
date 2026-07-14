import type { LanguageModel } from "@/lib/ai/ai-types";

const makeStubModel = (text: string): LanguageModel => ({
  specificationVersion: "v1",
  provider: "anthropic",
  modelId: "stub",
  doGenerate: async () => ({ content: [{ type: "text", text }] }),
  doStream: async () => ({ stream: new ReadableStream() }),
});

export const chatModel: LanguageModel = makeStubModel("Hello, world!");
export const reasoningModel: LanguageModel = makeStubModel("Hello, world!");
export const titleModel: LanguageModel = makeStubModel("This is a test title");
