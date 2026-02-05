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

// Generate OAuth signature without POST parameters (Twitter API v2 requirement)
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

// Send a tweet
async function sendTweet(tweetText: string, replyToTweetId?: string): Promise<any> {
  const url = `${BASE_URL}/tweets`;
  const method = "POST";
  
  const body: Record<string, any> = { text: tweetText };
  if (replyToTweetId) {
    body.reply = { in_reply_to_tweet_id: replyToTweetId };
  }

  const oauthHeader = generateOAuthHeader(method, url);
  console.log("Sending tweet:", tweetText.substring(0, 50) + "...");

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  console.log("Twitter API response status:", response.status);

  if (!response.ok) {
    throw new Error(`Twitter API error: ${response.status} - ${responseText}`);
  }

  return JSON.parse(responseText);
}

// Log activity to database
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

    const { content, replyToTweetId, scheduledTweetId } = await req.json();

    if (!content || typeof content !== "string") {
      throw new Error("Tweet content is required");
    }

    if (content.length > 280) {
      throw new Error("Tweet content exceeds 280 characters");
    }

    // Rate limiting: Check recent tweets (max 50 tweets per 24 hours for safety)
    const { count } = await supabase
      .from("tweet_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "post_tweet")
      .eq("status", "success")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if ((count || 0) >= 50) {
      throw new Error("Rate limit exceeded: Maximum 50 tweets per 24 hours");
    }

    // Send the tweet
    const result = await sendTweet(content, replyToTweetId);
    const tweetId = result.data?.id;

    // Log successful activity
    await logActivity(supabase, "post_tweet", content, tweetId, "success", undefined, {
      is_reply: !!replyToTweetId,
      reply_to: replyToTweetId,
    });

    // Update scheduled tweet if applicable
    if (scheduledTweetId) {
      await supabase
        .from("scheduled_tweets")
        .update({ status: "posted", tweet_id: tweetId })
        .eq("id", scheduledTweetId);
    }

    console.log("Tweet posted successfully:", tweetId);

    return new Response(
      JSON.stringify({ success: true, tweetId, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error posting tweet:", error);

    // Try to log the error
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await logActivity(supabase, "post_tweet", "", undefined, "error", error.message);
    } catch (_) {}

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
