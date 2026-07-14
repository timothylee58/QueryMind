"use client";

import { useRef, useState } from "react";
import { CheckIcon, ClockIcon, SendIcon, XIcon } from "lucide-react";
import { executeSql, generateSql } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { nanoid } from "nanoid";
import type { Message } from "./MessageBubble";
import { MessageBubble } from "./MessageBubble";
import { SchemaSelector } from "./SchemaSelector";
import { SqlPreview } from "./SqlPreview";

type Step = "idle" | "generating" | "confirming" | "executing";

interface HistoryEntry {
  id: string;
  question: string;
  sql: string;
}

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [schema, setSchema] = useState("public");
  const [connectionString, setConnectionString] = useState("");
  const [pendingSql, setPendingSql] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [cachedSql, setCachedSql] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loading = step === "generating" || step === "executing";

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading || !connectionString.trim()) return;

    const userMsg: Message = { id: nanoid(), role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPendingQuestion(question);
    setStep("generating");
    scrollToBottom();

    try {
      const res = await generateSql(question, connectionString, schema);
      setPendingSql(res.sql);
      setCachedSql(res.cached);
      setStep("confirming");
      scrollToBottom();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "assistant",
          content: "",
          error: err instanceof Error ? err.message : "Failed to generate SQL",
        },
      ]);
      setStep("idle");
      scrollToBottom();
    }
  }

  async function handleConfirm() {
    if (!pendingSql) return;
    setStep("executing");
    try {
      const res = await executeSql(pendingSql, connectionString);
      const assistantMsg: Message = {
        id: nanoid(),
        role: "assistant",
        content: cachedSql ? "Here are the results (from cache):" : "Here are the results:",
        sql: res.sql,
        results: res.results,
        rowCount: res.row_count,
        executionTimeMs: res.execution_time_ms,
        cached: cachedSql,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setHistory((prev) =>
        [{ id: nanoid(), question: pendingQuestion, sql: pendingSql }, ...prev].slice(0, 20)
      );
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "assistant",
          content: "",
          error: err instanceof Error ? err.message : "Query execution failed",
        },
      ]);
    } finally {
      setPendingSql(null);
      setPendingQuestion("");
      setStep("idle");
      scrollToBottom();
    }
  }

  function handleCancel() {
    setMessages((prev) => [
      ...prev,
      { id: nanoid(), role: "assistant", content: "", error: "Query cancelled." },
    ]);
    setPendingSql(null);
    setPendingQuestion("");
    setStep("idle");
    scrollToBottom();
  }

  function handleHistorySelect(entry: HistoryEntry) {
    setInput(entry.question);
    setShowHistory(false);
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
        {messages.length === 0 && step === "idle" && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground">
            <p className="text-sm">Ask a question about your data in plain English.</p>
            <p className="text-xs opacity-60">e.g. "Show me the 10 most recent users"</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {step === "generating" && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm bg-muted/40 px-4 py-3">
              <div className="flex gap-1.5 items-center" aria-label="Generating SQL" role="status">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-2">Generating SQL…</span>
              </div>
            </div>
          </div>
        )}

        {step === "confirming" && pendingSql && (
          <div className="flex justify-start">
            <div className="max-w-[85%] space-y-3">
              <div className="rounded-2xl rounded-tl-sm bg-muted/40 px-4 py-2.5 text-sm text-foreground">
                Review the generated SQL and confirm to execute:
              </div>
              <SqlPreview sql={pendingSql} cached={cachedSql} executionTimeMs={0} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleConfirm} className="gap-1.5">
                  <CheckIcon className="size-3.5" />
                  Run query
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel} className="gap-1.5">
                  <XIcon className="size-3.5" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "executing" && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm bg-muted/40 px-4 py-3">
              <div className="flex gap-1.5 items-center" aria-label="Executing query" role="status">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-2">Executing…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* History dropdown */}
      {showHistory && history.length > 0 && (
        <div className="absolute bottom-28 left-4 right-4 z-10 rounded-lg border border-border bg-background shadow-lg max-h-60 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
            Recent queries (this session)
          </div>
          {history.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/40 transition-colors truncate"
              onClick={() => handleHistorySelect(entry)}
            >
              {entry.question}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-border bg-background px-4 pt-3 pb-1 relative">
        <input
          className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 mb-2"
          placeholder="PostgreSQL connection string (postgresql://user:pass@host/db)"
          value={connectionString}
          onChange={(e) => setConnectionString(e.target.value)}
          disabled={loading}
          aria-label="Database connection string"
          autoComplete="off"
          type="password"
        />
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 pb-2"
          aria-label="Query input"
        >
          <SchemaSelector value={schema} onChange={setSchema} />
          {history.length > 0 && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => setShowHistory((v) => !v)}
              aria-label="Show query history"
              title="Recent queries"
            >
              <ClockIcon className="size-4" />
            </Button>
          )}
          <input
            className="flex-1 rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            placeholder={connectionString.trim() ? "Ask a question about your data…" : "Enter a connection string above first"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || !connectionString.trim() || step === "confirming"}
            aria-label="Natural language query"
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon-sm"
            disabled={!input.trim() || loading || !connectionString.trim() || step === "confirming"}
            aria-label="Send query"
          >
            <SendIcon className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
