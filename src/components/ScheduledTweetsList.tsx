import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Trash2, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { getScheduledTweets, cancelScheduledTweet, deleteScheduledTweet, processScheduledTweets } from "@/lib/twitter-api";
import type { ScheduledTweet } from "@/types/database";
import { toast } from "sonner";
import { format } from "date-fns";

interface ScheduledTweetsListProps {
  refreshTrigger?: number;
}

export function ScheduledTweetsList({ refreshTrigger }: ScheduledTweetsListProps) {
  const [tweets, setTweets] = useState<ScheduledTweet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchTweets = async () => {
    try {
      const data = await getScheduledTweets();
      setTweets(data);
    } catch (error: any) {
      toast.error("Failed to fetch scheduled tweets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTweets();
  }, [refreshTrigger]);

  const handleCancel = async (id: string) => {
    try {
      await cancelScheduledTweet(id);
      toast.success("Tweet cancelled");
      fetchTweets();
    } catch (error: any) {
      toast.error("Failed to cancel tweet");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteScheduledTweet(id);
      toast.success("Tweet deleted");
      fetchTweets();
    } catch (error: any) {
      toast.error("Failed to delete tweet");
    }
  };

  const handleProcessNow = async () => {
    setIsProcessing(true);
    try {
      const result = await processScheduledTweets();
      if (result.processed > 0) {
        toast.success(`Processed ${result.processed} scheduled tweets`);
        fetchTweets();
      } else {
        toast.info("No pending tweets to process");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to process scheduled tweets");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: ScheduledTweet["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "posted":
        return <Badge className="bg-success text-success-foreground">Posted</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return null;
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Scheduled Tweets
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleProcessNow} disabled={isProcessing}>
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Process Now
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {tweets.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No scheduled tweets</p>
        ) : (
          <div className="space-y-4">
            {tweets.map((tweet) => (
              <div
                key={tweet.id}
                className="flex flex-col gap-3 rounded-lg border bg-card/50 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(tweet.status)}
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(tweet.scheduled_for), "MMM d, yyyy h:mm a")}
                    </span>
                    {tweet.is_reply && (
                      <Badge variant="outline" className="text-xs">
                        Reply
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{tweet.content}</p>
                  {tweet.error_message && (
                    <p className="text-sm text-destructive">{tweet.error_message}</p>
                  )}
                  {tweet.tweet_id && (
                    <a
                      href={`https://twitter.com/i/web/status/${tweet.tweet_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View tweet →
                    </a>
                  )}
                </div>
                {tweet.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(tweet.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tweet.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
