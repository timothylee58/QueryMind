import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_CHAT_MODEL, titleModel } from "./models";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Return the model ID to use for the main chat. */
export function getLanguageModelId(modelId?: string): string {
  return modelId ?? DEFAULT_CHAT_MODEL;
}

/** Return the model ID to use for title generation. */
export function getTitleModelId(): string {
  return titleModel.id;
}

/** @deprecated Use getLanguageModelId instead */
export function getLanguageModel(modelId: string) {
  return modelId;
}

/** @deprecated Use getTitleModelId instead */
export function getTitleModel() {
  return titleModel.id;
}
