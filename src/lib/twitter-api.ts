import { supabase } from "@/integrations/supabase/client";
import type { ScheduledTweet, TweetLog } from "@/types/database";

// Post a tweet immediately
export async function postTweet(content: string, replyToTweetId?: string) {
  const { data, error } = await supabase.functions.invoke("post-tweet", {
    body: { content, replyToTweetId },
  });

  if (error) throw error;
  return data;
}

// Generate AI tweet content
export async function generateTweet(options: {
  topic: string;
  tone?: string;
  includeHashtags?: boolean;
  maxLength?: number;
}) {
  const { data, error } = await supabase.functions.invoke("generate-tweet", {
    body: options,
  });

  if (error) throw error;
  return data;
}

// Schedule a tweet
export async function scheduleTweet(
  content: string,
  scheduledFor: Date,
  replyToTweetId?: string
): Promise<ScheduledTweet> {
  const { data, error } = await supabase
    .from("scheduled_tweets")
    .insert({
      content,
      scheduled_for: scheduledFor.toISOString(),
      is_reply: !!replyToTweetId,
      reply_to_tweet_id: replyToTweetId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ScheduledTweet;
}

// Get scheduled tweets
export async function getScheduledTweets(
  status?: ScheduledTweet["status"]
): Promise<ScheduledTweet[]> {
  let query = supabase
    .from("scheduled_tweets")
    .select("*")
    .order("scheduled_for", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as ScheduledTweet[];
}

// Cancel a scheduled tweet
export async function cancelScheduledTweet(id: string) {
  const { error } = await supabase
    .from("scheduled_tweets")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) throw error;
}

// Delete a scheduled tweet
export async function deleteScheduledTweet(id: string) {
  const { error } = await supabase
    .from("scheduled_tweets")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// Get activity logs
export async function getTweetLogs(limit = 50): Promise<TweetLog[]> {
  const { data, error } = await supabase
    .from("tweet_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as TweetLog[];
}

// Trigger processing of scheduled tweets (for manual testing)
export async function processScheduledTweets() {
  const { data, error } = await supabase.functions.invoke("process-scheduled", {
    body: {},
  });

  if (error) throw error;
  return data;
}
