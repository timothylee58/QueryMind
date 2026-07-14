export type GenerateSqlInput = {
  question: string;
  schema: string;
  dialect?: "postgresql" | "mysql" | "sqlite";
};

export async function executeGenerateSql(input: GenerateSqlInput) {
  return {
    sql: "",
    explanation: "",
    isReadOnly: true,
    question: input.question,
    schema: input.schema,
    dialect: input.dialect ?? "postgresql",
  };
}

export const generateSql = {
  definition: {
    name: "generateSql" as const,
    description:
      "Generate a SQL query from a natural language question given a database schema. Returns the SQL, an explanation, and whether it is read-only.",
    input_schema: {
      type: "object" as const,
      properties: {
        question: {
          type: "string",
          description: "The natural language question to answer",
        },
        schema: {
          type: "string",
          description: "The database schema context (tables and columns)",
        },
        dialect: {
          type: "string",
          enum: ["postgresql", "mysql", "sqlite"],
          description: "SQL dialect to use (default: postgresql)",
        },
      },
      required: ["question", "schema"],
    },
  },
  execute: executeGenerateSql,
};
