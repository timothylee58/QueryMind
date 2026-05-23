CREATE TABLE IF NOT EXISTS "QueryHistory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "question" text NOT NULL,
  "generatedSql" text NOT NULL,
  "rowCount" integer NOT NULL DEFAULT 0,
  "executionMs" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
