export type ExplainSqlInput = { sql: string };

export async function executeExplainSql(input: ExplainSqlInput) {
  return {
    sql: input.sql,
    explanation: "",
    tables: [] as string[],
    operations: [] as string[],
  };
}

export const explainSql = {
  definition: {
    name: "explainSql" as const,
    description:
      "Explain what a SQL query does in plain English, identifying the tables and operations involved.",
    input_schema: {
      type: "object" as const,
      properties: {
        sql: { type: "string", description: "The SQL query to explain" },
      },
      required: ["sql"],
    },
  },
  execute: executeExplainSql,
};
