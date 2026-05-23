"use client";

import { ChevronDownIcon, ChevronRightIcon, Table2Icon } from "lucide-react";
import { useState } from "react";

export type SchemaTable = {
  name: string;
  columns: { name: string; type: string }[];
};

export function SchemaExplorer({ schema }: { schema: SchemaTable[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  if (schema.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground">
        No tables found
      </div>
    );
  }

  return (
    <div className="w-64 flex-shrink-0 overflow-y-auto border-r border-border bg-sidebar py-2">
      <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Schema
      </div>
      {schema.map((table) => {
        const isOpen = expanded.has(table.name);
        return (
          <div key={table.name}>
            <button
              className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-sm hover:bg-sidebar-accent/50 transition-colors"
              onClick={() => toggle(table.name)}
              type="button"
            >
              {isOpen ? (
                <ChevronDownIcon className="size-3 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRightIcon className="size-3 text-muted-foreground flex-shrink-0" />
              )}
              <Table2Icon className="size-3.5 text-primary flex-shrink-0" />
              <span className="truncate font-medium">{table.name}</span>
            </button>
            {isOpen && (
              <div className="pb-1">
                {table.columns.map((col) => (
                  <div
                    key={col.name}
                    className="flex items-center justify-between px-8 py-0.5 text-xs"
                  >
                    <span className="text-sidebar-foreground/80 truncate">
                      {col.name}
                    </span>
                    <span className="text-muted-foreground ml-2 flex-shrink-0 text-[10px]">
                      {col.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
