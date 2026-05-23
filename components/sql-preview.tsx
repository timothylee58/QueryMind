"use client";

import { AlertTriangleIcon, CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const WRITE_PATTERN = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE)\b/i;

export function SqlPreview({
  sql,
  explanation,
  onConfirm,
  onReject,
}: {
  sql: string;
  explanation: string;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const isWrite = WRITE_PATTERN.test(sql);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <span className="text-sm font-medium">Generated SQL</span>
        {isWrite && (
          <Badge variant="destructive" className="flex items-center gap-1 text-xs">
            <AlertTriangleIcon className="size-3" />
            Write Operation
          </Badge>
        )}
      </div>
      <pre className="overflow-x-auto p-4 text-sm font-mono leading-relaxed text-green-400 bg-zinc-950">
        <code>{sql}</code>
      </pre>
      {explanation && (
        <div className="px-4 py-3 border-t border-border text-sm text-muted-foreground">
          {explanation}
        </div>
      )}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={onConfirm}
        >
          <CheckIcon className="size-3.5 mr-1" />
          Run Query
        </Button>
        <Button size="sm" variant="outline" onClick={onReject}>
          <XIcon className="size-3.5 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
