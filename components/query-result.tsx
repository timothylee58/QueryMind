"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type QueryResultProps = {
  rows: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  executionMs: number;
};

function isNumericColumn(rows: Record<string, unknown>[], col: string) {
  return rows.some((r) => typeof r[col] === "number");
}

export function QueryResult({
  rows,
  columns,
  rowCount,
  executionMs,
}: QueryResultProps) {
  const [chartType, setChartType] = useState<"table" | "bar" | "line">(
    "table"
  );

  const numericCols = columns.filter((c) => isNumericColumn(rows, c));
  const labelCol = columns.find((c) => !numericCols.includes(c)) ?? columns[0];
  const canChart = rowCount <= 100 && numericCols.length > 0 && rows.length > 0;

  const chartData = rows.map((row) => {
    const obj: Record<string, unknown> = { label: String(row[labelCol] ?? "") };
    for (const col of numericCols) {
      obj[col] = Number(row[col]);
    }
    return obj;
  });

  const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981"];

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
        <span className="text-sm font-medium">
          {rowCount} {rowCount === 1 ? "row" : "rows"} · {executionMs}ms
        </span>
        {canChart && (
          <div className="flex gap-1">
            {(["table", "bar", "line"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  chartType === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setChartType(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {chartType === "table" || !canChart ? (
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-muted/20 sticky top-0">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left font-medium text-muted-foreground border-b border-border text-xs"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static list
                <tr
                  key={i}
                  className="border-b border-border/50 hover:bg-muted/10"
                >
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-1.5 text-xs font-mono">
                      {row[col] === null ? (
                        <span className="text-muted-foreground italic">
                          null
                        </span>
                      ) : (
                        String(row[col])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No rows returned
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: 6,
                  }}
                />
                {numericCols.map((col, i) => (
                  <Bar
                    key={col}
                    dataKey={col}
                    fill={COLORS[i % COLORS.length]}
                  />
                ))}
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: 6,
                  }}
                />
                {numericCols.map((col, i) => (
                  <Line
                    key={col}
                    type="monotone"
                    dataKey={col}
                    stroke={COLORS[i % COLORS.length]}
                    dot={false}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
