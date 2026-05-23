import { tool } from "ai";
import { z } from "zod";
import { getTargetDbClient } from "@/lib/db/connection";

const WRITE_PATTERN = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE)\b/i;

export const executeQuery = tool({
  description:
    "Execute a SQL query against the connected database. Requires user confirmation (confirmed: true) before running. Write operations (INSERT/UPDATE/DELETE/DROP/ALTER) are blocked without explicit confirmation.",
  inputSchema: z.object({
    sql: z.string().describe("The SQL query to execute"),
    confirmed: z
      .boolean()
      .describe("Whether the user has confirmed they want to run this query"),
    connectionString: z
      .string()
      .describe("The Postgres connection string for the target database"),
  }),
  execute: async (input) => {
    if (!input.confirmed) {
      return { error: "Query not confirmed by user" };
    }

    if (WRITE_PATTERN.test(input.sql) && !input.confirmed) {
      return { error: "Write operations require explicit confirmation" };
    }

    const client = getTargetDbClient(input.connectionString);
    try {
      const start = Date.now();
      const rows = await client.unsafe(input.sql);
      const executionMs = Date.now() - start;

      const typedRows = rows as Record<string, unknown>[];
      const columns = typedRows.length > 0 ? Object.keys(typedRows[0]) : [];

      return {
        rows: typedRows,
        columns,
        rowCount: typedRows.length,
        executionMs,
      };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Query execution failed",
      };
    } finally {
      await client.end();
    }
  },
});
