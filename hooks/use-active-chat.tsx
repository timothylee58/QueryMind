"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { useDataStream } from "@/components/chat/data-stream-provider";
import { getChatHistoryPaginationKey } from "@/components/chat/sidebar-history";
import { toast } from "@/components/chat/toast";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import type { ChatStatus, UseChatHelpers } from "@/lib/ai/ai-types";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import type { Vote } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";

type ActiveChatContextValue = {
  chatId: string;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  status: ChatStatus;
  stop: UseChatHelpers<ChatMessage>["stop"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  addToolApprovalResponse: NonNullable<
    UseChatHelpers<ChatMessage>["addToolApprovalResponse"]
  >;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  visibilityType: VisibilityType;
  isReadonly: boolean;
  isLoading: boolean;
  votes: Vote[] | undefined;
  currentModelId: string;
  setCurrentModelId: (id: string) => void;
  showCreditCardAlert: boolean;
  setShowCreditCardAlert: Dispatch<SetStateAction<boolean>>;
};

const ActiveChatContext = createContext<ActiveChatContextValue | null>(null);

function extractChatId(pathname: string): string | null {
  const match = pathname.match(/\/chat\/([^/]+)/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// SSE streaming chat implementation
// ---------------------------------------------------------------------------

// biome-ignore lint/suspicious/noExplicitAny: SSE events are typed loosely
type SSEEvent = Record<string, any>;

async function streamChat(
  params: {
    chatId: string;
    message: ChatMessage;
    selectedChatModel: string;
    selectedVisibilityType: VisibilityType;
    schemaContext?: string;
  },
  callbacks: {
    onText: (text: string, messageId: string) => void;
    onToolUse: (id: string, name: string, input: Record<string, unknown>, messageId: string) => void;
    onToolResult: (id: string, result: unknown, messageId: string) => void;
    onData: (event: { type: string; data: unknown }) => void;
    onTitle: (title: string) => void;
    onDone: () => void;
    onError: (err: Error) => void;
  },
  signal: AbortSignal,
): Promise<string> {
  const assistantId = generateUUID();

  const response = await fetchWithErrorHandlers(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: params.chatId,
        message: params.message,
        selectedChatModel: params.selectedChatModel,
        selectedVisibilityType: params.selectedVisibilityType,
        schemaContext: params.schemaContext,
      }),
      signal,
    },
  );

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      if (!chunk.startsWith("data: ")) continue;
      const raw = chunk.slice(6).trim();
      if (!raw) continue;

      let event: SSEEvent;
      try {
        event = JSON.parse(raw) as SSEEvent;
      } catch {
        continue;
      }

      if (event.type === "text") {
        callbacks.onText(event.text, assistantId);
      } else if (event.type === "tool_use") {
        callbacks.onToolUse(
          event.id,
          event.name,
          event.input ?? {},
          assistantId,
        );
      } else if (event.type === "tool_result") {
        callbacks.onToolResult(event.id, event.result, assistantId);
      } else if (event.type === "done") {
        callbacks.onDone();
      } else if (event.type === "error") {
        callbacks.onError(new Error(event.error));
      } else if ("data" in event) {
        callbacks.onData(event as { type: string; data: unknown });
      }
    }
  }

  return assistantId;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ActiveChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { setDataStream } = useDataStream();
  const { mutate } = useSWRConfig();

  const chatIdFromUrl = extractChatId(pathname);
  const isNewChat = !chatIdFromUrl;
  const newChatIdRef = useRef(generateUUID());
  const prevPathnameRef = useRef(pathname);

  if (isNewChat && prevPathnameRef.current !== pathname) {
    newChatIdRef.current = generateUUID();
  }
  prevPathnameRef.current = pathname;

  const chatId = chatIdFromUrl ?? newChatIdRef.current;

  const [currentModelId, setCurrentModelId] = useState(DEFAULT_CHAT_MODEL);
  const currentModelIdRef = useRef(currentModelId);
  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  const [input, setInput] = useState("");
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");

  const abortRef = useRef<AbortController | null>(null);

  const { data: chatData, isLoading } = useSWR(
    isNewChat
      ? null
      : `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/messages?chatId=${chatId}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const visibility: VisibilityType = isNewChat
    ? "private"
    : (chatData?.visibility ?? "private");

  // Sync messages from SWR
  const loadedChatIds = useRef(new Set<string>());

  useEffect(() => {
    if (isNewChat) {
      loadedChatIds.current.add(newChatIdRef.current);
      return;
    }
    if (chatData?.messages && !loadedChatIds.current.has(chatId)) {
      loadedChatIds.current.add(chatId);
      setMessages(chatData.messages as ChatMessage[]);
    }
  }, [chatId, chatData?.messages, isNewChat]);

  // Clear messages when switching to a new chat
  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      if (isNewChat) {
        setMessages([]);
      }
    }
  }, [chatId, isNewChat]);

  // Read model from cookie
  useEffect(() => {
    if (chatData && !isNewChat) {
      const cookieModel = document.cookie
        .split("; ")
        .find((row) => row.startsWith("chat-model="))
        ?.split("=")[1];
      if (cookieModel) {
        setCurrentModelId(decodeURIComponent(cookieModel));
      }
    }
  }, [chatData, isNewChat]);

  // ---------------------------------------------------------------------------
  // sendMessage
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback(
    async (userMsg: { role: "user"; parts: Array<{ type: "text"; text: string }> }) => {
      if (status === "loading" || status === "streaming") return;

      const msgId = generateUUID();
      const userChatMsg: ChatMessage = {
        id: msgId,
        role: "user",
        parts: userMsg.parts,
        metadata: { createdAt: new Date().toISOString() },
      };

      setMessages((prev) => [...prev, userChatMsg]);
      setStatus("loading");

      // Placeholder assistant message
      const assistantId = generateUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        parts: [],
        metadata: { createdAt: new Date().toISOString() },
      };
      setMessages((prev) => [...prev, assistantMsg]);

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        setStatus("streaming");

        await streamChat(
          {
            chatId,
            message: userChatMsg,
            selectedChatModel: currentModelIdRef.current,
            selectedVisibilityType: visibility,
          },
          {
            onText(text, aid) {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== aid) return m;
                  const parts = [...m.parts];
                  const lastPart = parts[parts.length - 1];
                  if (lastPart?.type === "text") {
                    return {
                      ...m,
                      parts: [
                        ...parts.slice(0, -1),
                        {
                          ...lastPart,
                          text: (lastPart as { type: "text"; text: string }).text + text,
                        },
                      ],
                    };
                  }
                  return {
                    ...m,
                    parts: [...parts, { type: "text" as const, text }],
                  };
                }),
              );
            },
            onToolUse(id, name, toolInput, aid) {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== aid) return m;
                  return {
                    ...m,
                    parts: [
                      ...m.parts,
                      {
                        type: "tool-invocation" as const,
                        toolCallId: id,
                        toolName: name,
                        args: toolInput,
                        state: "input-available" as const,
                      },
                    ],
                  };
                }),
              );
            },
            onToolResult(id, result, aid) {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== aid) return m;
                  return {
                    ...m,
                    parts: m.parts.map((p) => {
                      if (
                        p.type === "tool-invocation" &&
                        (p as { type: "tool-invocation"; toolCallId: string }).toolCallId === id
                      ) {
                        return {
                          ...p,
                          state: "output-available" as const,
                          result,
                        };
                      }
                      return p;
                    }),
                  };
                }),
              );
            },
            onData(event) {
              setDataStream((ds) => (ds ? [...ds, event as never] : []));
            },
            onTitle(_title) {
              // Title is updated server-side via after()
            },
            onDone() {
              setStatus("idle");
              mutate(unstable_serialize(getChatHistoryPaginationKey));
            },
            onError(err) {
              setStatus("error");
              if (err instanceof ChatbotError) {
                toast({ type: "error", description: err.message });
              } else {
                toast({
                  type: "error",
                  description: err.message || "Oops, an error occurred!",
                });
              }
            },
          },
          abortController.signal,
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          setStatus("idle");
          return;
        }
        setStatus("error");
        const error = err instanceof Error ? err : new Error("Unknown error");
        if (error instanceof ChatbotError) {
          toast({ type: "error", description: error.message });
        } else {
          toast({
            type: "error",
            description: error.message || "Oops, an error occurred!",
          });
        }
      }
    },
    [chatId, status, visibility, setDataStream, mutate],
  );

  // ---------------------------------------------------------------------------
  // stop / regenerate
  // ---------------------------------------------------------------------------

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
  }, []);

  const regenerate = useCallback(() => {
    // Find last user message and resend
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      // Remove last assistant message
      setMessages((prev) => {
        const idx = prev.findLastIndex((m) => m.role === "assistant");
        if (idx >= 0) {
          return prev.filter((_, i) => i !== idx);
        }
        return prev;
      });
      sendMessage({
        role: "user",
        parts: lastUserMsg.parts.filter((p) => p.type === "text") as Array<{
          type: "text";
          text: string;
        }>,
      });
    }
  }, [messages, sendMessage]);

  // ---------------------------------------------------------------------------
  // Auto-append ?query= param
  // ---------------------------------------------------------------------------

  const hasAppendedQueryRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("query");
    if (query && !hasAppendedQueryRef.current) {
      hasAppendedQueryRef.current = true;
      window.history.replaceState(
        {},
        "",
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`,
      );
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text" as const, text: query }],
      });
    }
  }, [sendMessage, chatId]);

  // ---------------------------------------------------------------------------
  // Votes
  // ---------------------------------------------------------------------------

  const isReadonly = isNewChat ? false : (chatData?.isReadonly ?? false);

  const { data: votes } = useSWR<Vote[]>(
    !isReadonly && messages.length >= 2
      ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote?chatId=${chatId}`
      : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------

  const value = useMemo<ActiveChatContextValue>(
    () => ({
      chatId,
      messages,
      setMessages,
      sendMessage,
      status,
      stop,
      regenerate,
      addToolApprovalResponse: () => {
        // Tool approval flow not implemented in Anthropic SDK version
      },
      input,
      setInput,
      visibilityType: visibility,
      isReadonly,
      isLoading: !isNewChat && isLoading,
      votes,
      currentModelId,
      setCurrentModelId,
      showCreditCardAlert,
      setShowCreditCardAlert,
    }),
    [
      chatId,
      messages,
      sendMessage,
      status,
      stop,
      regenerate,
      input,
      visibility,
      isReadonly,
      isNewChat,
      isLoading,
      votes,
      currentModelId,
      showCreditCardAlert,
    ],
  );

  return (
    <ActiveChatContext.Provider value={value}>
      {children}
    </ActiveChatContext.Provider>
  );
}

export function useActiveChat() {
  const context = useContext(ActiveChatContext);
  if (!context) {
    throw new Error("useActiveChat must be used within ActiveChatProvider");
  }
  return context;
}
