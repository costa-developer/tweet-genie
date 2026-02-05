export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface ScheduledTweet {
  id: string
  content: string
  scheduled_for: string
  status: 'pending' | 'posted' | 'failed' | 'cancelled'
  tweet_id: string | null
  error_message: string | null
  is_reply: boolean
  reply_to_tweet_id: string | null
  created_at: string
  updated_at: string
}

export interface TweetLog {
  id: string
  action: string
  tweet_content: string | null
  tweet_id: string | null
  status: 'success' | 'error'
  error_message: string | null
  metadata: Json
  created_at: string
}

export interface BotConfig {
  id: string
  key: string
  value: string
  created_at: string
  updated_at: string
}
