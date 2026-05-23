import postgres from "postgres";

export function getTargetDbClient(connectionString: string) {
  return postgres(connectionString, { max: 1, idle_timeout: 20 });
}

type ColumnInfo = {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
};

export async function getSchemaContext(
  connectionString: string
): Promise<string> {
  const sql = getTargetDbClient(connectionString);
  try {
    const rows = await sql<ColumnInfo[]>`
      SELECT
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_name = c.table_name
        AND t.table_schema = c.table_schema
      WHERE c.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name, c.ordinal_position
    `;

    const tables = new Map<string, { name: string; type: string; nullable: boolean }[]>();
    for (const row of rows) {
      if (!tables.has(row.table_name)) {
        tables.set(row.table_name, []);
      }
      tables.get(row.table_name)!.push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === "YES",
      });
    }

    const lines: string[] = ["Database Schema (public schema):"];
    for (const [tableName, columns] of tables) {
      lines.push(`\nTable: ${tableName}`);
      for (const col of columns) {
        lines.push(
          `  - ${col.name}: ${col.type}${col.nullable ? " (nullable)" : ""}`
        );
      }
    }

    return lines.join("\n");
  } finally {
    await sql.end();
  }
}

export type SchemaTable = {
  name: string;
  columns: { name: string; type: string }[];
};

export async function getSchemaStructured(
  connectionString: string
): Promise<SchemaTable[]> {
  const sql = getTargetDbClient(connectionString);
  try {
    const rows = await sql<
      { table_name: string; column_name: string; data_type: string }[]
    >`
      SELECT
        c.table_name,
        c.column_name,
        c.data_type
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_name = c.table_name
        AND t.table_schema = c.table_schema
      WHERE c.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name, c.ordinal_position
    `;

    const tables = new Map<string, { name: string; type: string }[]>();
    for (const row of rows) {
      if (!tables.has(row.table_name)) {
        tables.set(row.table_name, []);
      }
      tables.get(row.table_name)!.push({
        name: row.column_name,
        type: row.data_type,
      });
    }

    return Array.from(tables.entries()).map(([name, columns]) => ({
      name,
      columns,
    }));
  } finally {
    await sql.end();
  }
}
