"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type StrengthEntry = {
  label: string;
  confidence: number;
};

const strengthData: StrengthEntry[] = [
  { label: "Communication", confidence: 82 },
  { label: "Trust", confidence: 76 },
  { label: "Consistency", confidence: 91 },
  { label: "Follow-through", confidence: 88 },
];

export default function IdentityGraphsPage() {
  return (
    <div className="w-full h-[420px] rounded-xl bg-zinc-900 p-6 border border-zinc-800">
      <h2 className="text-lg font-semibold text-white mb-4">
        Relationship Confidence Signals
      </h2>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={strengthData}>
          <XAxis
            dataKey="label"
            stroke="#9ca3af"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke="#9ca3af"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
            }}
            formatter={(value) => {
              if (typeof value !== "number") return null;
              return `${value.toFixed(0)}%`;
            }}
          />

          <Bar
            dataKey="confidence"
            fill="#22c55e"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}