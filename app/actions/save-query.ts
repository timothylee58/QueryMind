"use server";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { auth } from "@/app/(auth)/auth";
import { queryHistory } from "@/lib/db/schema";

export async function saveQueryHistory({
  question,
  generatedSql,
  rowCount,
  executionMs,
}: {
  question: string;
  generatedSql: string;
  rowCount: number;
  executionMs: number;
}) {
  const session = await auth();
  if (!session?.user?.id) return;

  const client = postgres(process.env.POSTGRES_URL!);
  const db = drizzle(client);

  try {
    await db.insert(queryHistory).values({
      userId: session.user.id,
      question,
      generatedSql,
      rowCount,
      executionMs,
      createdAt: new Date(),
    });
  } finally {
    await client.end();
  }
}
