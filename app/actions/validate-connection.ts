"use server";

import { getTargetDbClient } from "@/lib/db/connection";

export async function validateConnection(
  connectionString: string
): Promise<{ success: boolean; error?: string }> {
  if (!connectionString || !connectionString.trim()) {
    return { success: false, error: "Connection string is required" };
  }

  const client = getTargetDbClient(connectionString);
  try {
    await client`SELECT 1`;
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to connect to database",
    };
  } finally {
    await client.end();
  }
}
