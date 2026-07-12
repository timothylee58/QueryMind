"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryResultTableProps {
  results: Record<string, unknown>[];
  rowCount: number;
  columns?: string[];
}

const PAGE_SIZE = 10;

export function QueryResultTable({
  results,
  rowCount,
  columns,
}: QueryResultTableProps) {
  const [page, setPage] = useState(0);

  const cols =
    columns ?? (results.length > 0 ? Object.keys(results[0]) : []);
  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  const pageRows = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-border py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Query returned 0 rows.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-3 py-2">
        <span className="text-xs text-muted-foreground">
          {rowCount} {rowCount === 1 ? "row" : "rows"}
        </span>
        {results.length > 500 && (
          <span className="text-xs text-amber-500">
            Results limited to 500 rows
          </span>
        )}
      </div>

      <div className="overflow-x-auto max-h-72">
        <table className="w-full text-sm" aria-label="Query results">
          <thead className="sticky top-0 bg-muted/30 backdrop-blur-sm">
            <tr>
              {cols.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="border-b border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                // biome-ignore lint/suspicious/noArrayIndexKey: static rows
                key={i}
                className="border-b border-border/40 hover:bg-muted/10 transition-colors"
              >
                {cols.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-2 font-mono text-xs text-foreground/90"
                  >
                    {row[col] === null ? (
                      <span className="text-muted-foreground italic">null</span>
                    ) : (
                      String(row[col])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} / {totalPages}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
