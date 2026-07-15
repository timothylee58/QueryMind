import type { Session } from "next-auth";
import type { UIMessageStreamWriter } from "@/lib/ai/ai-types";
import { getDocumentById, saveDocument } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

type EditDocumentProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export type EditDocumentInput = {
  id: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
};

export function editDocument({ session, dataStream }: EditDocumentProps) {
  return {
    definition: {
      name: "editDocument" as const,
      description:
        "Make a targeted edit to an existing artifact by finding and replacing an exact string. Preferred over updateDocument for small changes. The old_string must match exactly.",
      input_schema: {
        type: "object" as const,
        properties: {
          id: {
            type: "string",
            description: "The ID of the artifact to edit",
          },
          old_string: {
            type: "string",
            description:
              "Exact string to find. Include 3-5 surrounding lines for uniqueness.",
          },
          new_string: {
            type: "string",
            description: "Replacement string",
          },
          replace_all: {
            type: "boolean",
            description:
              "Replace all occurrences instead of just the first (default false)",
          },
        },
        required: ["id", "old_string", "new_string"],
      },
    },
    execute: async ({ id, old_string, new_string, replace_all }: EditDocumentInput) => {
      const document = await getDocumentById({ id });

      if (!document) {
        return { error: "Document not found" };
      }

      if (document.userId !== session.user?.id) {
        return { error: "Forbidden" };
      }

      if (!document.content) {
        return { error: "Document has no content" };
      }

      if (!document.content.includes(old_string)) {
        return { error: "old_string not found in document" };
      }

      const updated = replace_all
        ? document.content.replaceAll(old_string, new_string)
        : document.content.replace(old_string, new_string);

      await saveDocument({
        id: document.id,
        title: document.title,
        kind: document.kind,
        content: updated,
        userId: document.userId,
      });

      dataStream.write({ type: "data-clear", data: null, transient: true });

      if (document.kind === "code") {
        dataStream.write({
          type: "data-codeDelta",
          data: updated,
          transient: true,
        });
      } else if (document.kind === "sheet") {
        dataStream.write({
          type: "data-sheetDelta",
          data: updated,
          transient: true,
        });
      } else {
        dataStream.write({
          type: "data-textDelta",
          data: updated,
          transient: true,
        });
      }

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title: document.title,
        kind: document.kind,
        content:
          document.kind === "code"
            ? "The script has been edited successfully."
            : "The document has been edited successfully.",
      };
    },
  };
}
