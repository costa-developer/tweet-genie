import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { getTweetLogs } from "@/lib/twitter-api";
import type { TweetLog } from "@/types/database";
import { toast } from "sonner";
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

const CHART_COLORS = {
  primary: "hsl(203, 89%, 53%)",
  success: "hsl(142, 70%, 45%)",
  destructive: "hsl(0, 62%, 50%)",
  warning: "hsl(38, 92%, 50%)",
  muted: "hsl(215, 20%, 65%)",
};

export default function Analytics() {
  const [logs, setLogs] = useState<TweetLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getTweetLogs(500);
        setLogs(data);
      } catch {
        toast.error("Failed to load analytics data");
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayLogs = logs.filter((l) => format(new Date(l.created_at), "yyyy-MM-dd") === dayStr);
      const success = dayLogs.filter((l) => l.status === "success").length;
      const failed = dayLogs.filter((l) => l.status === "error").length;
      return {
        date: format(day, "MMM d"),
        success,
        failed,
        total: success + failed,
      };
    });
  }, [logs]);

  const actionBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach((l) => {
      const label =
        l.action === "post_tweet" ? "Direct Post" :
        l.action === "scheduled_tweet" ? "Scheduled" :
        l.action === "reply" ? "Reply" : l.action;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [logs]);

  const statusBreakdown = useMemo(() => {
    const success = logs.filter((l) => l.status === "success").length;
    const failed = logs.filter((l) => l.status === "error").length;
    return [
      { name: "Success", value: success },
      { name: "Failed", value: failed },
    ].filter((d) => d.value > 0);
  }, [logs]);

  const successRateData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayLogs = logs.filter((l) => format(new Date(l.created_at), "yyyy-MM-dd") === dayStr);
      const total = dayLogs.length;
      const success = dayLogs.filter((l) => l.status === "success").length;
      return {
        date: format(day, "MMM d"),
        rate: total > 0 ? Math.round((success / total) * 100) : null,
      };
    });
  }, [logs]);

  const PIE_COLORS = [CHART_COLORS.primary, CHART_COLORS.warning, CHART_COLORS.success, CHART_COLORS.muted];
  const STATUS_COLORS = [CHART_COLORS.success, CHART_COLORS.destructive];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center gap-4 px-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">Analytics</h1>
            <p className="text-xs text-muted-foreground">Tweet performance over the last 14 days</p>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        <div className="space-y-6">
          {/* Posts Per Day */}
          <Card className="glass-card animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Posts Per Day</CardTitle>
              <CardDescription>Daily tweet volume (success vs failed)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                    <XAxis dataKey="date" tick={{ fill: CHART_COLORS.muted, fontSize: 12 }} />
                    <YAxis tick={{ fill: CHART_COLORS.muted, fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 47%, 8%)",
                        border: "1px solid hsl(222, 30%, 18%)",
                        borderRadius: "8px",
                        color: "hsl(210, 40%, 98%)",
                      }}
                    />
                    <Bar dataKey="success" stackId="a" fill={CHART_COLORS.success} name="Success" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="failed" stackId="a" fill={CHART_COLORS.destructive} name="Failed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Success Rate Over Time */}
            <Card className="glass-card animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg">Success Rate</CardTitle>
                <CardDescription>Daily success rate percentage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={successRateData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                      <XAxis dataKey="date" tick={{ fill: CHART_COLORS.muted, fontSize: 11 }} />
                      <YAxis tick={{ fill: CHART_COLORS.muted, fontSize: 11 }} domain={[0, 100]} unit="%" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(222, 47%, 8%)",
                          border: "1px solid hsl(222, 30%, 18%)",
                          borderRadius: "8px",
                          color: "hsl(210, 40%, 98%)",
                        }}
                        formatter={(value: any) => (value !== null ? `${value}%` : "No data")}
                      />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS.primary, r: 3 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Action Breakdown */}
            <Card className="glass-card animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg">Tweet Types</CardTitle>
                <CardDescription>Breakdown by action type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {actionBreakdown.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">No data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={actionBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {actionBreakdown.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(222, 47%, 8%)",
                            border: "1px solid hsl(222, 30%, 18%)",
                            borderRadius: "8px",
                            color: "hsl(210, 40%, 98%)",
                          }}
                        />
                        <Legend wrapperStyle={{ color: CHART_COLORS.muted }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <Card className="glass-card animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Overall Status</CardTitle>
              <CardDescription>Success vs failure rate across all tweets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {statusBreakdown.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {statusBreakdown.map((_, i) => (
                          <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(222, 47%, 8%)",
                          border: "1px solid hsl(222, 30%, 18%)",
                          borderRadius: "8px",
                          color: "hsl(210, 40%, 98%)",
                        }}
                      />
                      <Legend wrapperStyle={{ color: CHART_COLORS.muted }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
