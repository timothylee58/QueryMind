import type { Session } from "next-auth";
import type { UIMessageStreamWriter } from "@/lib/ai/ai-types";
import { documentHandlersByArtifactKind } from "@/lib/artifacts/server";
import { getDocumentById } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

type UpdateDocumentProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  modelId: string;
};

export type UpdateDocumentInput = {
  id: string;
  description?: string;
};

export function updateDocument({
  session,
  dataStream,
  modelId,
}: UpdateDocumentProps) {
  return {
    definition: {
      name: "updateDocument" as const,
      description:
        "Full rewrite of an existing artifact. Only use for major changes where most content needs replacing. Prefer editDocument for targeted changes.",
      input_schema: {
        type: "object" as const,
        properties: {
          id: {
            type: "string",
            description: "The ID of the artifact to rewrite",
          },
          description: {
            type: "string",
            description: "The description of changes that need to be made",
          },
        },
        required: ["id"],
      },
    },
    execute: async ({ id, description = "Improve the content" }: UpdateDocumentInput) => {
      const document = await getDocumentById({ id });

      if (!document) {
        return { error: "Document not found" };
      }

      if (document.userId !== session.user?.id) {
        return { error: "Forbidden" };
      }

      dataStream.write({ type: "data-clear", data: null, transient: true });

      const documentHandler = documentHandlersByArtifactKind.find(
        (h) => h.kind === document.kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${document.kind}`);
      }

      await documentHandler.onUpdateDocument({
        document,
        description,
        dataStream,
        session,
        modelId,
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title: document.title,
        kind: document.kind,
        content:
          document.kind === "code"
            ? "The script has been updated successfully."
            : "The document has been updated successfully.",
      };
    },
  };
}
