/**
 * Type shim replacing @ai-sdk/react and ai package type exports.
 * Runtime implementations of useChat, DefaultChatTransport, streamText etc.
 * have been replaced with Anthropic SDK equivalents.
 */

import type { Suggestion } from "@/lib/db/schema";
import type { ArtifactKind } from "@/components/chat/artifact";

// ---------------------------------------------------------------------------
// Chat status
// ---------------------------------------------------------------------------

export type ChatStatus =
  | "idle"
  | "ready"
  | "loading"
  | "submitted"
  | "streaming"
  | "error";

// ---------------------------------------------------------------------------
// Message part types
// ---------------------------------------------------------------------------

export type TextUIPart = { type: "text"; text: string };

export type ToolUIPart = {
  type: "tool-invocation";
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
  state:
    | "input-available"
    | "input-streaming"
    | "output-available"
    | "output-error"
    | "approval-requested"
    | "approval-responded"
    | "output-denied";
  result?: unknown;
  approval?: { approved: boolean };
};

export type DynamicToolUIPart = Omit<ToolUIPart, "type"> & {
  type: "dynamic-tool";
};

/** Named tool part: type is "tool-{toolName}" (SDK v6 convention). */
export type NamedToolUIPart = Omit<ToolUIPart, "type" | "output"> & {
  type: `tool-${string}`;
  // biome-ignore lint/suspicious/noExplicitAny: tool outputs vary by tool name
  output?: any;
};

export type FileUIPart = {
  type: "file";
  mediaType: string;
  filename?: string;
  name?: string;
  url: string;
};

export type SourceDocumentUIPart = {
  type: "source-document";
  id: string;
  title: string;
  url: string;
};

export type DataUIPart<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  [K in keyof T]: { type: `data-${string & K}`; data: T[K] };
}[keyof T];

export type ReasoningUIPart = { type: "reasoning"; text: string };

export type UIMessagePart<
  DataTypes extends Record<string, unknown> = Record<string, unknown>,
  // biome-ignore lint/suspicious/noExplicitAny: generic tool types
  Tools extends Record<string, { args: any; result: any }> = Record<
    string,
    // biome-ignore lint/suspicious/noExplicitAny: generic tool types
    { args: any; result: any }
  >,
> =
  | TextUIPart
  | ReasoningUIPart
  | ToolUIPart
  | DynamicToolUIPart
  | NamedToolUIPart
  | FileUIPart
  | SourceDocumentUIPart
  | DataUIPart<DataTypes>;

export type UIMessage<
  Metadata = unknown,
  DataTypes extends Record<string, unknown> = Record<string, unknown>,
  // biome-ignore lint/suspicious/noExplicitAny: generic tool types
  Tools extends Record<string, { args: any; result: any }> = Record<
    string,
    // biome-ignore lint/suspicious/noExplicitAny: generic tool types
    { args: any; result: any }
  >,
> = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: UIMessagePart<DataTypes, Tools>[];
  metadata?: Metadata;
};

// ---------------------------------------------------------------------------
// Stream writer interface (used by document tools)
// ---------------------------------------------------------------------------

export type UIMessageStreamWriter<_T = unknown> = {
  write(data: { type: string; data: unknown; transient?: boolean }): void;
  merge(stream: unknown): void;
};

// ---------------------------------------------------------------------------
// Type inference helper
// ---------------------------------------------------------------------------

// biome-ignore lint/suspicious/noExplicitAny: deliberate generic inference
export type InferUITool<T> = T extends (...args: any[]) => {
  // biome-ignore lint/suspicious/noExplicitAny: deliberate generic inference
  parameters?: any;
  // biome-ignore lint/suspicious/noExplicitAny: deliberate generic inference
  execute?: (...a: any[]) => Promise<any>;
}
  ? {
      args: unknown;
      result: unknown;
    }
  : { args: unknown; result: unknown };

// ---------------------------------------------------------------------------
// Language model interface (for test mocks)
// ---------------------------------------------------------------------------

export type LanguageModel = {
  specificationVersion?: string;
  provider?: string;
  modelId?: string;
  // biome-ignore lint/suspicious/noExplicitAny: test mock interface
  doGenerate?: (options: any) => Promise<any>;
  // biome-ignore lint/suspicious/noExplicitAny: test mock interface
  doStream?: (options: any) => Promise<any>;
};

// ---------------------------------------------------------------------------
// UseChatHelpers type (replacing @ai-sdk/react export)
// ---------------------------------------------------------------------------

export type UseChatHelpers<T extends UIMessage = UIMessage> = {
  messages: T[];
  setMessages: (messages: T[] | ((prev: T[]) => T[])) => void;
  sendMessage: (
    // biome-ignore lint/suspicious/noExplicitAny: message parts vary by content type
    message: { role: "user"; parts: any[] },
  ) => Promise<void>;
  status: ChatStatus;
  stop: () => void;
  regenerate: () => void;
  addToolApprovalResponse: (params: {
    toolCallId?: string;
    id?: string;
    approved: boolean;
    reason?: string;
    // biome-ignore lint/suspicious/noExplicitAny: varies per tool
    [key: string]: any;
  }) => void;
  resumeStream: () => void;
};

// ---------------------------------------------------------------------------
// Custom data types used in the UI (mirrors CustomUIDataTypes from lib/types)
// ---------------------------------------------------------------------------

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  "chat-title": string;
};
