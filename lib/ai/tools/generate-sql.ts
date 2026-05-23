import { tool } from "ai";
import { z } from "zod";

export const generateSql = tool({
  description:
    "Generate a SQL query from a natural language question given a database schema. Returns the SQL, an explanation, and whether it is read-only.",
  inputSchema: z.object({
    question: z.string().describe("The natural language question to answer"),
    schema: z
      .string()
      .describe("The database schema context (tables and columns)"),
    dialect: z
      .enum(["postgresql", "mysql", "sqlite"])
      .default("postgresql")
      .describe("SQL dialect to use"),
  }),
  execute: async (input) => {
    return {
      sql: "",
      explanation: "",
      isReadOnly: true,
      question: input.question,
      schema: input.schema,
      dialect: input.dialect,
    };
  },
});
