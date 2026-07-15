import { getTargetDbClient } from "@/lib/db/connection";

const WRITE_PATTERN = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE)\b/i;

export type ExecuteQueryInput = {
  sql: string;
  confirmed: boolean;
  connectionString: string;
};

export async function executeExecuteQuery(input: ExecuteQueryInput) {
  if (!input.confirmed) {
    return { error: "Query not confirmed by user" };
  }

  if (WRITE_PATTERN.test(input.sql)) {
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
}

export const executeQuery = {
  definition: {
    name: "executeQuery" as const,
    description:
      "Execute a SQL query against the connected database. Requires user confirmation (confirmed: true) before running. Write operations (INSERT/UPDATE/DELETE/DROP/ALTER) are blocked without explicit confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        sql: { type: "string", description: "The SQL query to execute" },
        confirmed: {
          type: "boolean",
          description:
            "Whether the user has confirmed they want to run this query",
        },
        connectionString: {
          type: "string",
          description: "The Postgres connection string for the target database",
        },
      },
      required: ["sql", "confirmed", "connectionString"],
    },
  },
  execute: executeExecuteQuery,
};
