import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatDate } from "~/lib/dates";
import { cn } from "~/lib/utils";

type Point = {
  value: number;
  at: Date | number;
};

type SparklineChartProps = {
  points: Point[];
  className?: string;
  unit?: string;
  timeZone?: string;
  /** Optional fixed time window (e.g. selected timeframe). */
  from?: Date | number;
  to?: Date | number;
};

function formatValue(value: number, unit?: string) {
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return unit ? `${formatted} ${unit}` : formatted;
}

function toTimestamp(at: Date | number) {
  return at instanceof Date ? at.getTime() : at;
}

export function SparklineChart({
  points,
  className,
  unit,
  timeZone,
  from,
  to,
}: SparklineChartProps) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">No measurements in this timeframe.</p>;
  }

  const data = [...points]
    .map((point) => ({
      at: toTimestamp(point.at),
      value: point.value,
    }))
    .sort((a, b) => a.at - b.at);

  const values = data.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = max === min ? Math.max(Math.abs(max) * 0.05, 0.5) : (max - min) * 0.12;

  const times = data.map((p) => p.at);
  const dataMin = Math.min(...times);
  const dataMax = Math.max(...times);
  const timeMin = from != null ? toTimestamp(from) : dataMin;
  const timeMax = to != null ? toTimestamp(to) : dataMax;
  const timePad = timeMax === timeMin ? 12 * 60 * 60 * 1000 : 0;

  return (
    <div className={cn("h-44 w-full", className)}>
      <ResponsiveContainer
        height="100%"
        initialDimension={{ width: 320, height: 176 }}
        minWidth={0}
        width="100%"
      >
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="measurementFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="at"
            domain={[timeMin - timePad, timeMax + timePad]}
            minTickGap={28}
            scale="time"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(value: number) => formatDate(new Date(value), timeZone)}
            tickLine={false}
            type="number"
          />
          <YAxis
            axisLine={false}
            domain={[min - pad, max + pad]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(value: number) => formatValue(value, unit)}
            tickLine={false}
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              boxShadow: "none",
              color: "var(--foreground)",
              fontSize: 12,
            }}
            formatter={(value) => [formatValue(Number(value), unit), "Value"]}
            labelFormatter={(label) => formatDate(new Date(Number(label)), timeZone)}
          />
          <Area
            activeDot={{ r: 5, strokeWidth: 1.75, stroke: "var(--card)", fill: "var(--primary)" }}
            dataKey="value"
            dot={{ r: 3.5, strokeWidth: 1.75, stroke: "var(--primary)", fill: "var(--card)" }}
            fill="url(#measurementFill)"
            stroke="var(--primary)"
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
