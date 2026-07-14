import type Anthropic from "@anthropic-ai/sdk";
import { geolocation, ipAddress } from "@vercel/functions";
import { after } from "next/server";
import { auth, type UserType } from "@/app/(auth)/auth";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import {
  allowedModelIds,
  DEFAULT_CHAT_MODEL,
} from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { anthropic } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { editDocument } from "@/lib/ai/tools/edit-document";
import { executeQuery } from "@/lib/ai/tools/execute-query";
import { explainSql } from "@/lib/ai/tools/explain-sql";
import { generateSql } from "@/lib/ai/tools/generate-sql";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import type { UIMessageStreamWriter, TextUIPart, ToolUIPart } from "@/lib/ai/ai-types";
import {
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
  updateMessage,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { checkIpRateLimit } from "@/lib/ratelimit";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Convert our ChatMessage format to Anthropic message format
// ---------------------------------------------------------------------------

function convertToAnthropicMessages(
  messages: ChatMessage[],
): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === "system") continue;

    if (msg.role === "user") {
      const textParts = msg.parts
        .filter((p) => p.type === "text")
        .map((p) => {
          const tp = p as TextUIPart;
          return { type: "text" as const, text: tp.text };
        });

      if (textParts.length > 0) {
        result.push({
          role: "user",
          content: textParts.length === 1 ? textParts[0].text : textParts,
        });
      }
    } else if (msg.role === "assistant") {
      // biome-ignore lint/suspicious/noExplicitAny: Anthropic ContentBlock union is too strict for our usage
      const assistantContent: any[] = [];
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const part of msg.parts) {
        if (part.type === "text") {
          const tp = part as TextUIPart;
          if (tp.text) {
            assistantContent.push({ type: "text", text: tp.text });
          }
        } else if (part.type === "tool-invocation") {
          const tp = part as ToolUIPart;
          assistantContent.push({
            type: "tool_use",
            id: tp.toolCallId,
            name: tp.toolName,
            input: (tp.args ?? {}) as Record<string, unknown>,
          });
          if (tp.result !== undefined) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: tp.toolCallId,
              content:
                typeof tp.result === "string"
                  ? tp.result
                  : JSON.stringify(tp.result),
            });
          }
        }
      }

      if (assistantContent.length > 0) {
        result.push({ role: "assistant", content: assistantContent });
      }

      if (toolResults.length > 0) {
        result.push({ role: "user", content: toolResults });
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      messages,
      selectedChatModel,
      selectedVisibilityType,
      schemaContext,
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const chatModel = allowedModelIds.has(selectedChatModel)
      ? selectedChatModel
      : DEFAULT_CHAT_MODEL;

    await checkIpRateLimit(ipAddress(request));

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 1,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerHour) {
      return new ChatbotError("rate_limit:chat").toResponse();
    }

    const chat = await getChatById({ id });
    let messagesFromDb: import("@/lib/db/schema").DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
      messagesFromDb = await getMessagesByChatId({ id });
    } else if (message?.role === "user") {
      await saveChat({
        id,
        userId: session.user.id,
        title: "New chat",
        visibility: selectedVisibilityType,
      });
      titlePromise = generateTitleFromUserMessage({ message });
    }

    const dbMessages = convertToUIMessages(messagesFromDb);

    // Build the full message list for context
    let uiMessages: ChatMessage[];
    if (messages) {
      // Tool approval continuation — use DB messages merged with approval states
      const approvalStates = new Map(
        messages.flatMap(
          (m) =>
            (m.parts ?? [])
              .filter(
                (p: Record<string, unknown>) =>
                  p.state === "approval-responded" ||
                  p.state === "output-denied",
              )
              .map((p: Record<string, unknown>) => [
                String(p.toolCallId ?? ""),
                p,
              ]) ?? [],
        ),
      );
      uiMessages = dbMessages.map((msg) => ({
        ...msg,
        parts: msg.parts.map((part) => {
          if (
            "toolCallId" in part &&
            approvalStates.has(String((part as ToolUIPart).toolCallId))
          ) {
            return {
              ...part,
              ...approvalStates.get(
                String((part as ToolUIPart).toolCallId),
              ),
            };
          }
          return part;
        }),
      })) as ChatMessage[];
    } else {
      uiMessages = [
        ...dbMessages,
        message as ChatMessage,
      ];
    }

    if (message?.role === "user") {
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: message.id,
            role: "user",
            parts: message.parts,
            attachments: [],
            createdAt: new Date(),
          },
        ],
      });
    }

    const { longitude, latitude, city, country } = geolocation(request);
    const requestHints: RequestHints = { longitude, latitude, city, country };

    const systemPromptText = systemPrompt({
      requestHints,
      supportsTools: true,
      schemaContext,
    });

    // SSE streaming response
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        };

        // Data stream writer passed to document tools
        const dataStream: UIMessageStreamWriter<ChatMessage> = {
          write(data) {
            send({ type: data.type, data: data.data });
          },
          merge() {
            // not needed
          },
        };

        // Build tool factories
        const createDocTool = createDocument({
          session,
          dataStream,
          modelId: chatModel,
        });
        const editDocTool = editDocument({ session, dataStream });
        const updateDocTool = updateDocument({
          session,
          dataStream,
          modelId: chatModel,
        });
        const requestSuggestionsTool = requestSuggestions({
          session,
          dataStream,
          modelId: chatModel,
        });

        // biome-ignore lint/suspicious/noExplicitAny: tool inputs are unknown at this layer
        const toolExecutors: Record<string, (input: any) => Promise<unknown>> = {
          getWeather: getWeather.execute,
          createDocument: createDocTool.execute,
          editDocument: editDocTool.execute,
          updateDocument: updateDocTool.execute,
          requestSuggestions: requestSuggestionsTool.execute,
          generateSql: generateSql.execute,
          executeQuery: executeQuery.execute,
          explainSql: explainSql.execute,
        };

        const toolDefinitions = [
          getWeather.definition,
          createDocTool.definition,
          editDocTool.definition,
          updateDocTool.definition,
          requestSuggestionsTool.definition,
          generateSql.definition,
          executeQuery.definition,
          explainSql.definition,
        ] as Anthropic.Tool[];

        // Messages accumulated across tool steps
        const anthropicMessages = convertToAnthropicMessages(uiMessages);

        // Collect the full assistant response for DB persistence
        const assistantParts: ChatMessage["parts"] = [];
        const assistantId = generateUUID();

        try {
          let step = 0;
          const MAX_STEPS = 5;

          while (step < MAX_STEPS) {
            const anthropicStream = anthropic.messages.stream({
              model: chatModel,
              max_tokens: 8096,
              system: systemPromptText,
              messages: anthropicMessages,
              tools: toolDefinitions,
            });

            let currentText = "";

            // Stream text deltas to client in real time
            for await (const event of anthropicStream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                currentText += event.delta.text;
                send({ type: "text", text: event.delta.text });
              }
            }

            const finalMsg = await anthropicStream.finalMessage();

            // Collect text for DB
            if (currentText) {
              assistantParts.push({ type: "text", text: currentText });
              currentText = "";
            }

            if (finalMsg.stop_reason !== "tool_use") {
              break;
            }

            // Execute tool calls
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of finalMsg.content) {
              if (block.type !== "tool_use") continue;

              send({
                type: "tool_use",
                id: block.id,
                name: block.name,
                input: block.input,
                state: "input-available",
              });

              // Collect tool invocation for DB
              assistantParts.push({
                type: "tool-invocation",
                toolCallId: block.id,
                toolName: block.name,
                args: block.input as Record<string, unknown>,
                state: "input-available",
              });

              const executor = toolExecutors[block.name];

              if (!executor) {
                const errorResult = { error: `Unknown tool: ${block.name}` };
                send({ type: "tool_result", id: block.id, result: errorResult });
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify(errorResult),
                });
                // Update DB part
                const partIdx = assistantParts.findLastIndex(
                  (p) =>
                    p.type === "tool-invocation" &&
                    (p as ToolUIPart).toolCallId === block.id,
                );
                if (partIdx >= 0) {
                  (assistantParts[partIdx] as ToolUIPart).state = "output-available";
                  (assistantParts[partIdx] as ToolUIPart).result = errorResult;
                }
                continue;
              }

              try {
                const result = await executor(block.input);
                send({ type: "tool_result", id: block.id, result });
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify(result),
                });
                const partIdx = assistantParts.findLastIndex(
                  (p) =>
                    p.type === "tool-invocation" &&
                    (p as ToolUIPart).toolCallId === block.id,
                );
                if (partIdx >= 0) {
                  (assistantParts[partIdx] as ToolUIPart).state = "output-available";
                  (assistantParts[partIdx] as ToolUIPart).result = result;
                }
              } catch (err) {
                const errorResult = {
                  error:
                    err instanceof Error
                      ? err.message
                      : "Tool execution failed",
                };
                send({ type: "tool_result", id: block.id, result: errorResult });
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify(errorResult),
                });
                const partIdx = assistantParts.findLastIndex(
                  (p) =>
                    p.type === "tool-invocation" &&
                    (p as ToolUIPart).toolCallId === block.id,
                );
                if (partIdx >= 0) {
                  (assistantParts[partIdx] as ToolUIPart).state = "output-available";
                  (assistantParts[partIdx] as ToolUIPart).result = errorResult;
                }
              }
            }

            anthropicMessages.push(
              { role: "assistant", content: finalMsg.content },
              { role: "user", content: toolResults },
            );

            step++;
          }

          // Send chat title if newly created
          if (titlePromise) {
            const title = await titlePromise;
            send({ type: "data-chat-title", data: title });
            after(() => updateChatTitleById({ chatId: id, title }));
          }

          send({ type: "done" });

          // Persist assistant message
          after(async () => {
            if (assistantParts.length > 0) {
              await saveMessages({
                messages: [
                  {
                    id: assistantId,
                    role: "assistant",
                    parts: assistantParts,
                    createdAt: new Date(),
                    attachments: [],
                    chatId: id,
                  },
                ],
              });
            }
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "An error occurred";
          send({ type: "error", error: errorMessage });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    console.error("Unhandled error in chat API:", error);
    return new ChatbotError("offline:chat").toResponse();
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/chat
// ---------------------------------------------------------------------------

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
