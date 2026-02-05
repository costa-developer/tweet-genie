import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { getTweetLogs } from "@/lib/twitter-api";
import type { TweetLog } from "@/types/database";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

interface ActivityLogsProps {
  refreshTrigger?: number;
}

export function ActivityLogs({ refreshTrigger }: ActivityLogsProps) {
  const [logs, setLogs] = useState<TweetLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await getTweetLogs(50);
        setLogs(data);
      } catch (error: any) {
        toast.error("Failed to fetch activity logs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [refreshTrigger]);

  const getActionLabel = (action: string) => {
    switch (action) {
      case "post_tweet":
        return "Posted Tweet";
      case "scheduled_tweet":
        return "Scheduled Tweet";
      case "reply":
        return "Posted Reply";
      default:
        return action;
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No activity yet</p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-3 rounded-lg border bg-card/50 p-3"
                >
                  <div className="mt-0.5">
                    {log.status === "success" ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {getActionLabel(log.action)}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {log.tweet_content && (
                      <p className="text-sm text-foreground/80 line-clamp-2">
                        {log.tweet_content}
                      </p>
                    )}
                    {log.error_message && (
                      <p className="text-sm text-destructive">{log.error_message}</p>
                    )}
                    {log.tweet_id && (
                      <a
                        href={`https://twitter.com/i/web/status/${log.tweet_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View tweet →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
