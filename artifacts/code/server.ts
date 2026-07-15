import { codePrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { anthropic, getLanguageModelId } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

function stripFences(code: string): string {
  return code
    .replace(/^```[\w]*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

export const codeDocumentHandler = createDocumentHandler<"code">({
  kind: "code",
  onCreateDocument: async ({ title, dataStream, modelId }) => {
    let draftContent = "";

    const stream = anthropic.messages.stream({
      model: getLanguageModelId(modelId),
      max_tokens: 8096,
      system: `${codePrompt}\n\nOutput ONLY the code. No explanations, no markdown fences, no wrapping.`,
      messages: [{ role: "user", content: title }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        draftContent += event.delta.text;
        dataStream.write({
          type: "data-codeDelta",
          data: stripFences(draftContent),
          transient: true,
        });
      }
    }

    return stripFences(draftContent);
  },
  onUpdateDocument: async ({ document, description, dataStream, modelId }) => {
    let draftContent = "";

    const stream = anthropic.messages.stream({
      model: getLanguageModelId(modelId),
      max_tokens: 8096,
      system: `${updateDocumentPrompt(document.content, "code")}\n\nOutput ONLY the complete updated code. No explanations, no markdown fences, no wrapping.`,
      messages: [{ role: "user", content: description }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        draftContent += event.delta.text;
        dataStream.write({
          type: "data-codeDelta",
          data: stripFences(draftContent),
          transient: true,
        });
      }
    }

    return stripFences(draftContent);
  },
});
