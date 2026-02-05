import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Calendar, Activity, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { getScheduledTweets, getTweetLogs } from "@/lib/twitter-api";

interface StatsCardsProps {
  refreshTrigger?: number;
}

export function StatsCards({ refreshTrigger }: StatsCardsProps) {
  const [stats, setStats] = useState({
    postedToday: 0,
    pending: 0,
    totalPosts: 0,
    successRate: 100,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [logs, scheduled] = await Promise.all([
          getTweetLogs(100),
          getScheduledTweets(),
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const postedToday = logs.filter(
          (log) =>
            log.status === "success" &&
            new Date(log.created_at) >= today
        ).length;

        const pending = scheduled.filter((t) => t.status === "pending").length;
        const successLogs = logs.filter((l) => l.status === "success").length;
        const totalLogs = logs.length;
        const successRate = totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 100;

        setStats({
          postedToday,
          pending,
          totalPosts: successLogs,
          successRate,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };

    fetchStats();
  }, [refreshTrigger]);

  const cards = [
    {
      title: "Posted Today",
      value: stats.postedToday,
      icon: Send,
      color: "text-primary",
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: Calendar,
      color: "text-warning",
    },
    {
      title: "Total Posts",
      value: stats.totalPosts,
      icon: Activity,
      color: "text-success",
    },
    {
      title: "Success Rate",
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      color: "text-primary",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="glass-card animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
