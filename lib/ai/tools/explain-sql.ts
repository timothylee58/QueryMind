import { tool } from "ai";
import { z } from "zod";

export const explainSql = tool({
  description:
    "Explain what a SQL query does in plain English, identifying the tables and operations involved.",
  inputSchema: z.object({
    sql: z.string().describe("The SQL query to explain"),
  }),
  execute: async (input) => {
    return {
      sql: input.sql,
      explanation: "",
      tables: [] as string[],
      operations: [] as string[],
    };
  },
});
