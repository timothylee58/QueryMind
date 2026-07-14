import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { anthropic, getLanguageModelId } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const textDocumentHandler = createDocumentHandler<"text">({
  kind: "text",
  onCreateDocument: async ({ title, dataStream, modelId }) => {
    let draftContent = "";

    const stream = anthropic.messages.stream({
      model: getLanguageModelId(modelId),
      max_tokens: 8096,
      system:
        "Write about the given topic. Markdown is supported. Use headings wherever appropriate.",
      messages: [{ role: "user", content: title }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        draftContent += event.delta.text;
        dataStream.write({
          type: "data-textDelta",
          data: event.delta.text,
          transient: true,
        });
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream, modelId }) => {
    let draftContent = "";

    const stream = anthropic.messages.stream({
      model: getLanguageModelId(modelId),
      max_tokens: 8096,
      system: updateDocumentPrompt(document.content, "text"),
      messages: [{ role: "user", content: description }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        draftContent += event.delta.text;
        dataStream.write({
          type: "data-textDelta",
          data: event.delta.text,
          transient: true,
        });
      }
    }

    return draftContent;
  },
});
