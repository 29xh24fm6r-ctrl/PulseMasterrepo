"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";

type MomentumSnapshot = {
    domain_slug: string;
    score: number;
    streak_current: number;
    streak_longest: number;
    trend: "up" | "down" | "flat";
};

type MomentumHistoryItem = {
    day: string; // ISO
    dateStr?: string; // formatted
    total_weight: number;
    // can break down by domain if needed, API returns flattened sum per domain per day
    // The current API 'history' is list of { day, domain_slug, total_weight }
    // We need to pivot or just sum for total chart
};

type HistoryDatum = {
    name: string; // date
    value: number; // total score
};

export function MomentumCard() {
    const [loading, setLoading] = useState(true);
    const [snapshots, setSnapshots] = useState<MomentumSnapshot[]>([]);
    const [chartData, setChartData] = useState<HistoryDatum[]>([]);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch("/api/momentum/history?days=14");
                const json = await res.json();

                if (json && json.snapshots) {
                    setSnapshots(json.snapshots);
                }

                if (json && json.history) {
                    // Process history: group by day to get total daily momentum
                    const byDay: Record<string, number> = {};
                    (json.history as any[]).forEach((h) => {
                        const d = h.day.split("T")[0];
                        byDay[d] = (byDay[d] || 0) + h.total_weight;
                    });

                    const sortedDays = Object.keys(byDay).sort();
                    const data: HistoryDatum[] = sortedDays.map(d => ({
                        name: d.slice(5), // MM-DD
                        value: byDay[d]
                    }));
                    setChartData(data);
                }
            } catch (err) {
                console.error("Failed to load momentum", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) {
        return <Skeleton className="h-[300px] w-full rounded-xl" />;
    }

    // Calculate total score
    const totalScore = snapshots.reduce((acc, s) => acc + s.score, 0);
    // Find best streak
    const bestStreak = snapshots.reduce((max, s) => Math.max(max, s.streak_current), 0);
    // Overall trend (naive: if any up, up)
    const activeDomain = snapshots.find(s => s.trend === "up");
    const isTrendingUp = !!activeDomain;

    return (
        <Card className="col-span-1 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Momentum</CardTitle>
                {isTrendingUp ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                    <Activity className="h-4 w-4 text-muted-foreground" />
                )}
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline space-x-2">
                    <div className="text-2xl font-bold">{totalScore}</div>
                    <div className="text-xs text-muted-foreground">
                        current score
                    </div>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs font-semibold text-emerald-600">
                        {bestStreak} day streak
                    </span>
                </div>

                <div className="h-[120px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                                interval={2}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-4 space-y-2">
                    {snapshots.slice(0, 3).map(s => (
                        <div key={s.domain_slug} className="flex items-center justify-between text-xs">
                            <div className="capitalize text-muted-foreground">{s.domain_slug}</div>
                            <div className="font-medium flex items-center">
                                {s.score}
                                {s.trend === 'up' && <TrendingUp className="h-3 w-3 ml-1 text-emerald-500" />}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
