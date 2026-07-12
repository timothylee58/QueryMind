"use client";

import { useState } from "react";
import { CheckIcon, ClipboardIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SqlPreviewProps {
  sql: string;
  cached: boolean;
  executionTimeMs: number;
}

export function SqlPreview({ sql, cached, executionTimeMs }: SqlPreviewProps) {
  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="my-3 rounded-lg border border-border bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Generated SQL
          </span>
          {cached && (
            <Badge
              variant="outline"
              className="border-emerald-500/40 text-emerald-500 text-[10px]"
            >
              cached
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {executionTimeMs.toFixed(1)}ms
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={copyToClipboard}
            aria-label="Copy SQL to clipboard"
          >
            {copied ? (
              <CheckIcon className="size-3.5 text-emerald-500" />
            ) : (
              <ClipboardIcon className="size-3.5" />
            )}
          </Button>
        </div>
      </div>
      <pre className="overflow-x-auto p-4 text-sm font-mono leading-relaxed text-green-400 bg-zinc-950">
        <code>{sql}</code>
      </pre>
    </div>
  );
}
