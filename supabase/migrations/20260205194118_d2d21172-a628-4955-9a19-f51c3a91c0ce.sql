-- Create table for scheduled tweets
CREATE TABLE public.scheduled_tweets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'failed', 'cancelled')),
  tweet_id TEXT,
  error_message TEXT,
  is_reply BOOLEAN DEFAULT false,
  reply_to_tweet_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for activity logs
CREATE TABLE public.tweet_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  tweet_content TEXT,
  tweet_id TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for bot configuration
CREATE TABLE public.bot_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public access for this bot (no user auth needed)
ALTER TABLE public.scheduled_tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tweet_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_config ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (single-user bot)
CREATE POLICY "Allow all operations on scheduled_tweets" ON public.scheduled_tweets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on tweet_logs" ON public.tweet_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on bot_config" ON public.bot_config FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_scheduled_tweets_updated_at
  BEFORE UPDATE ON public.scheduled_tweets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bot_config_updated_at
  BEFORE UPDATE ON public.bot_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient querying of pending scheduled tweets
CREATE INDEX idx_scheduled_tweets_pending ON public.scheduled_tweets (scheduled_for) WHERE status = 'pending';