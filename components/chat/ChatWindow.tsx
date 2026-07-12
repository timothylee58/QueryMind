"use client";

import { useRef, useState } from "react";
import { SendIcon } from "lucide-react";
import { generateQuery } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { nanoid } from "nanoid";
import type { Message } from "./MessageBubble";
import { MessageBubble } from "./MessageBubble";
import { SchemaSelector } from "./SchemaSelector";

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState("public");
  const bottomRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    const userMsg: Message = { id: nanoid(), role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await generateQuery(question, schema);
      const assistantMsg: Message = {
        id: nanoid(),
        role: "assistant",
        content: res.cached
          ? "Here are the results (from cache):"
          : "Here are the results:",
        sql: res.sql,
        results: res.results,
        rowCount: res.row_count,
        executionTimeMs: res.execution_time_ms,
        cached: res.cached,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const assistantMsg: Message = {
        id: nanoid(),
        role: "assistant",
        content: "",
        error: err instanceof Error ? err.message : "Unexpected error",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message thread */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground">
            <p className="text-sm">Ask a question about your data in plain English.</p>
            <p className="text-xs opacity-60">e.g. "Show me the 10 most recent users"</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm bg-muted/40 px-4 py-3">
              <div className="flex gap-1.5" aria-label="Loading" role="status">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border bg-background px-4 py-3"
        aria-label="Query input"
      >
        <SchemaSelector value={schema} onChange={setSchema} />
        <input
          className="flex-1 rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          placeholder="Ask a question about your data…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          aria-label="Natural language query"
          autoComplete="off"
        />
        <Button
          type="submit"
          size="icon-sm"
          disabled={!input.trim() || loading}
          aria-label="Send query"
        >
          <SendIcon className="size-4" />
        </Button>
      </form>
    </div>
  );
}
