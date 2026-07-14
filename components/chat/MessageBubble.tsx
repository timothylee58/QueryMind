"use client";

import type { QueryResponse } from "@/types";
import { SqlPreview } from "./SqlPreview";
import { QueryResultTable } from "./QueryResultTable";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  results?: Record<string, unknown>[];
  rowCount?: number;
  executionTimeMs?: number;
  cached?: boolean;
  error?: string;
}

export function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2">
        {msg.error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <p className="font-medium">Query failed</p>
            <p className="mt-0.5 text-xs opacity-80">{msg.error}</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl rounded-tl-sm bg-muted/40 px-4 py-2.5 text-sm text-foreground">
              {msg.content}
            </div>
            {msg.sql && (
              <SqlPreview
                sql={msg.sql}
                cached={msg.cached ?? false}
                executionTimeMs={msg.executionTimeMs ?? 0}
              />
            )}
            {msg.results && (
              <QueryResultTable
                results={msg.results}
                rowCount={msg.rowCount ?? msg.results.length}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
