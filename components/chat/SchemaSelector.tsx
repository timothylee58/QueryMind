"use client";

import { useEffect, useState } from "react";
import { getSchema } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SchemaSelectorProps {
  value: string;
  onChange: (schema: string) => void;
}

export function SchemaSelector({ value, onChange }: SchemaSelectorProps) {
  const [schemas, setSchemas] = useState<string[]>(["public"]);

  useEffect(() => {
    getSchema("public")
      .then(() => {
        // Could enumerate schemas from information_schema here
        // For now default to public — extend when backend exposes /schemas list
        setSchemas(["public"]);
      })
      .catch(() => {
        // API not reachable yet — silent fail
      });
  }, []);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="h-8 w-32 text-xs"
        aria-label="Select database schema"
      >
        <SelectValue placeholder="Schema" />
      </SelectTrigger>
      <SelectContent>
        {schemas.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
