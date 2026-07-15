import type { Session } from "next-auth";
import type { UIMessageStreamWriter } from "@/lib/ai/ai-types";
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

type CreateDocumentProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  modelId: string;
};

export type CreateDocumentInput = {
  title: string;
  kind: "text" | "code" | "sheet";
};

export function createDocument({
  session,
  dataStream,
  modelId,
}: CreateDocumentProps) {
  return {
    definition: {
      name: "createDocument" as const,
      description:
        "Create an artifact. You MUST specify kind: use 'code' for any programming/algorithm request (creates a script), 'text' for essays/writing (creates a document), 'sheet' for spreadsheets/data.",
      input_schema: {
        type: "object" as const,
        properties: {
          title: { type: "string", description: "The title of the artifact" },
          kind: {
            type: "string",
            enum: [...artifactKinds],
            description:
              "REQUIRED. 'code' for programming/algorithms, 'text' for essays/writing, 'sheet' for spreadsheets",
          },
        },
        required: ["title", "kind"],
      },
    },
    execute: async ({ title, kind }: CreateDocumentInput) => {
      const id = generateUUID();

      dataStream.write({ type: "data-kind", data: kind, transient: true });
      dataStream.write({ type: "data-id", data: id, transient: true });
      dataStream.write({ type: "data-title", data: title, transient: true });
      dataStream.write({ type: "data-clear", data: null, transient: true });

      const documentHandler = documentHandlersByArtifactKind.find(
        (h) => h.kind === kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        dataStream,
        session,
        modelId,
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title,
        kind,
        content:
          kind === "code"
            ? "A script was created and is now visible to the user."
            : "A document was created and is now visible to the user.",
      };
    },
  };
}
