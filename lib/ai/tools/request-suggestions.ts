import type { Session } from "next-auth";
import type { UIMessageStreamWriter } from "@/lib/ai/ai-types";
import { getDocumentById, saveSuggestions } from "@/lib/db/queries";
import type { Suggestion } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { anthropic, getLanguageModelId } from "../providers";

type RequestSuggestionsProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  modelId: string;
};

export type RequestSuggestionsInput = { documentId: string };

export function requestSuggestions({
  session,
  dataStream,
  modelId,
}: RequestSuggestionsProps) {
  return {
    definition: {
      name: "requestSuggestions" as const,
      description:
        "Request writing suggestions for an existing document artifact. Only use this when the user explicitly asks to improve or get suggestions for a document they have already created. Never use for general questions.",
      input_schema: {
        type: "object" as const,
        properties: {
          documentId: {
            type: "string",
            description:
              "The UUID of an existing document artifact that was previously created with createDocument",
          },
        },
        required: ["documentId"],
      },
    },
    execute: async ({ documentId }: RequestSuggestionsInput) => {
      const document = await getDocumentById({ id: documentId });

      if (!document?.content) {
        return { error: "Document not found" };
      }

      if (document.userId !== session.user?.id) {
        return { error: "Forbidden" };
      }

      type SuggestionItem = {
        originalSentence: string;
        suggestedSentence: string;
        description: string;
      };

      const response = await anthropic.messages.create({
        model: getLanguageModelId(modelId),
        max_tokens: 4096,
        system:
          "You are a writing assistant. Given a piece of writing, offer up to 5 suggestions to improve it. Each suggestion must contain full sentences, not just individual words. Describe what changed and why. Return your response as a JSON array with objects containing: originalSentence, suggestedSentence, description.",
        messages: [{ role: "user", content: document.content }],
      });

      const textContent = response.content.find((b) => b.type === "text");
      const rawText = textContent?.type === "text" ? textContent.text : "[]";

      let items: SuggestionItem[] = [];
      try {
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          items = JSON.parse(jsonMatch[0]) as SuggestionItem[];
        }
      } catch {
        items = [];
      }

      const suggestions: Omit<
        Suggestion,
        "userId" | "createdAt" | "documentCreatedAt"
      >[] = [];

      for (const element of items) {
        if (
          !element?.originalSentence ||
          !element?.suggestedSentence ||
          !element?.description
        ) {
          continue;
        }

        const suggestion = {
          originalText: element.originalSentence,
          suggestedText: element.suggestedSentence,
          description: element.description,
          id: generateUUID(),
          documentId,
          isResolved: false,
        };

        dataStream.write({
          type: "data-suggestion",
          data: suggestion as Suggestion,
          transient: true,
        });

        suggestions.push(suggestion);
      }

      if (session.user?.id) {
        const userId = session.user.id;

        await saveSuggestions({
          suggestions: suggestions.map((suggestion) => ({
            ...suggestion,
            userId,
            createdAt: new Date(),
            documentCreatedAt: document.createdAt,
          })),
        });
      }

      return {
        id: documentId,
        title: document.title,
        kind: document.kind,
        message: "Suggestions have been added to the document",
      };
    },
  };
}
