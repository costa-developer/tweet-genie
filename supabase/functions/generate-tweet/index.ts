const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { topic, tone, includeHashtags, maxLength } = await req.json();

    if (!topic || typeof topic !== "string") {
      throw new Error("Topic is required");
    }

    // Build the prompt for tweet generation
    const toneDescription = tone || "professional and engaging";
    const length = maxLength || 280;
    const hashtagInstruction = includeHashtags 
      ? "Include 1-3 relevant hashtags at the end." 
      : "Do not include any hashtags.";

    const systemPrompt = `You are a professional social media manager creating engaging tweets. 
Your tweets should be:
- Concise and impactful
- Under ${length} characters
- Written in a ${toneDescription} tone
- Designed to maximize engagement

${hashtagInstruction}

Respond with ONLY the tweet text, nothing else. No quotes, no explanations.`;

    const userPrompt = `Create a tweet about: ${topic}`;

    console.log("Generating tweet about:", topic);

    // Call Lovable AI Gateway
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const aiResponse = await response.json();
    const generatedTweet = aiResponse.choices?.[0]?.message?.content?.trim();

    if (!generatedTweet) {
      throw new Error("Failed to generate tweet content");
    }

    // Ensure tweet is within character limit
    const finalTweet = generatedTweet.length > length 
      ? generatedTweet.substring(0, length - 3) + "..." 
      : generatedTweet;

    console.log("Generated tweet:", finalTweet);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tweet: finalTweet,
        characterCount: finalTweet.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error generating tweet:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
