"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SplitRow } from "@/lib/calculations/splits";
import { formatClock, formatKm, paceToUnit, paceUnitLabel, type PaceUnit } from "@/lib/format";

interface PaceChartProps {
  rows: SplitRow[];
  unit: PaceUnit;
  averagePaceSecPerKm: number;
  summary: string;
}

export function PaceChart({ rows, unit, averagePaceSecPerKm, summary }: PaceChartProps) {
  const data = rows.map((row) => ({
    km: formatKm(row.endKm),
    pace: Math.round(paceToUnit(row.paceSecPerKm, unit)),
  }));
  const average = Math.round(paceToUnit(averagePaceSecPerKm, unit));
  const paces = data.map((point) => point.pace);
  const lowest = Math.min(...paces);
  const highest = Math.max(...paces);
  const padding = Math.max(10, (30 - (highest - lowest)) / 2);
  const domain: [number, number] = [
    Math.floor((lowest - padding) / 5) * 5,
    Math.ceil((highest + padding) / 5) * 5,
  ];

  return (
    <figure>
      <div role="img" aria-label={summary} className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#2a302b" vertical={false} />
            <XAxis
              dataKey="km"
              stroke="#969d94"
              tick={{ fill: "#969d94", fontSize: 12 }}
              tickLine={false}
              interval="preserveStartEnd"
              label={{ value: "Kilometer", position: "insideBottom", offset: -4, fill: "#969d94", fontSize: 12 }}
              height={40}
            />
            <YAxis
              reversed
              width={52}
              stroke="#969d94"
              tick={{ fill: "#969d94", fontSize: 12 }}
              tickLine={false}
              domain={domain}
              tickFormatter={(value: number) => formatClock(value)}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: "#2a302b" }}
              contentStyle={{
                background: "#1c211d",
                border: "1px solid #2a302b",
                borderRadius: 8,
                color: "#f2f4ef",
                fontSize: 13,
              }}
              labelStyle={{ color: "#969d94" }}
              labelFormatter={(label) => `Km ${String(label)}`}
              formatter={(value) => [`${formatClock(Number(value))} ${paceUnitLabel(unit)}`, "Pace"]}
            />
            <ReferenceLine y={average} stroke="#969d94" strokeDasharray="4 4" />
            <Line
              type="linear"
              dataKey="pace"
              stroke="#c6f36b"
              strokeWidth={2}
              dot={{ r: data.length > 25 ? 2 : 3.5, fill: "#c6f36b", stroke: "#c6f36b" }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-xs text-muted">
        Sumbu pace dibalik: makin ke atas berarti makin cepat. Garis putus-putus adalah average pace. {summary}
      </figcaption>
    </figure>
  );
}
