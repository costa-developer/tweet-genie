import { createHmac } from "node:crypto";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Twitter API credentials
const API_KEY = Deno.env.get("TWITTER_CONSUMER_KEY")?.trim();
const API_SECRET = Deno.env.get("TWITTER_CONSUMER_SECRET")?.trim();
const ACCESS_TOKEN = Deno.env.get("TWITTER_ACCESS_TOKEN")?.trim();
const ACCESS_TOKEN_SECRET = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")?.trim();

function validateEnvironmentVariables() {
  if (!API_KEY) throw new Error("Missing TWITTER_CONSUMER_KEY");
  if (!API_SECRET) throw new Error("Missing TWITTER_CONSUMER_SECRET");
  if (!ACCESS_TOKEN) throw new Error("Missing TWITTER_ACCESS_TOKEN");
  if (!ACCESS_TOKEN_SECRET) throw new Error("Missing TWITTER_ACCESS_TOKEN_SECRET");
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&")
  )}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  const hmacSha1 = createHmac("sha1", signingKey);
  return hmacSha1.update(signatureBaseString).digest("base64");
}

function generateOAuthHeader(method: string, url: string): string {
  const oauthParams = {
    oauth_consumer_key: API_KEY!,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN!,
    oauth_version: "1.0",
  };

  const signature = generateOAuthSignature(method, url, oauthParams, API_SECRET!, ACCESS_TOKEN_SECRET!);
  const signedOAuthParams = { ...oauthParams, oauth_signature: signature };
  
  return "OAuth " + Object.entries(signedOAuthParams)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(", ");
}

const BASE_URL = "https://api.x.com/2";

async function sendTweet(tweetText: string, replyToTweetId?: string): Promise<any> {
  const url = `${BASE_URL}/tweets`;
  const method = "POST";
  
  const body: Record<string, any> = { text: tweetText };
  if (replyToTweetId) {
    body.reply = { in_reply_to_tweet_id: replyToTweetId };
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: generateOAuthHeader(method, url),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Twitter API error: ${response.status} - ${responseText}`);
  }

  return JSON.parse(responseText);
}

async function logActivity(
  supabase: any,
  action: string,
  tweetContent: string,
  tweetId?: string,
  status: "success" | "error" = "success",
  errorMessage?: string,
  metadata?: Record<string, any>
) {
  try {
    await supabase.from("tweet_logs").insert({
      action,
      tweet_content: tweetContent,
      tweet_id: tweetId,
      status,
      error_message: errorMessage,
      metadata: metadata || {},
    });
  } catch (logError) {
    console.error("Failed to log activity:", logError);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    validateEnvironmentVariables();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all pending scheduled tweets that are due
    const now = new Date().toISOString();
    const { data: pendingTweets, error: fetchError } = await supabase
      .from("scheduled_tweets")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true })
      .limit(10); // Process max 10 at a time to avoid timeouts

    if (fetchError) {
      throw new Error(`Failed to fetch scheduled tweets: ${fetchError.message}`);
    }

    if (!pendingTweets || pendingTweets.length === 0) {
      console.log("No pending tweets to process");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No pending tweets" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${pendingTweets.length} scheduled tweets`);

    const results: Array<{ id: string; status: string; tweetId?: string; error?: string }> = [];

    for (const scheduledTweet of pendingTweets) {
      try {
        // Rate limiting check (max 50 per 24h)
        const { count } = await supabase
          .from("tweet_logs")
          .select("*", { count: "exact", head: true })
          .eq("action", "scheduled_tweet")
          .eq("status", "success")
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if ((count || 0) >= 50) {
          console.log("Rate limit reached, stopping processing");
          break;
        }

        // Send the tweet
        const result = await sendTweet(scheduledTweet.content, scheduledTweet.reply_to_tweet_id);
        const tweetId = result.data?.id;

        // Update scheduled tweet status
        await supabase
          .from("scheduled_tweets")
          .update({ status: "posted", tweet_id: tweetId })
          .eq("id", scheduledTweet.id);

        // Log success
        await logActivity(
          supabase,
          "scheduled_tweet",
          scheduledTweet.content,
          tweetId,
          "success",
          undefined,
          { scheduled_tweet_id: scheduledTweet.id, is_reply: scheduledTweet.is_reply }
        );

        results.push({ id: scheduledTweet.id, status: "posted", tweetId });
        console.log(`Successfully posted scheduled tweet: ${scheduledTweet.id}`);

        // Small delay between tweets to avoid hitting rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));

      } catch (tweetError: any) {
        console.error(`Failed to post scheduled tweet ${scheduledTweet.id}:`, tweetError);

        // Update scheduled tweet with error
        await supabase
          .from("scheduled_tweets")
          .update({ status: "failed", error_message: tweetError.message })
          .eq("id", scheduledTweet.id);

        // Log error
        await logActivity(
          supabase,
          "scheduled_tweet",
          scheduledTweet.content,
          undefined,
          "error",
          tweetError.message,
          { scheduled_tweet_id: scheduledTweet.id }
        );

        results.push({ id: scheduledTweet.id, status: "failed", error: tweetError.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error processing scheduled tweets:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
