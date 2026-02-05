import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Sparkles, Calendar } from "lucide-react";
import { postTweet, generateTweet, scheduleTweet } from "@/lib/twitter-api";
import { toast } from "sonner";

interface TweetComposerProps {
  onTweetSent?: () => void;
}

export function TweetComposer({ onTweetSent }: TweetComposerProps) {
  const [content, setContent] = useState("");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const characterCount = content.length;
  const isOverLimit = characterCount > 280;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic for AI generation");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateTweet({
        topic: topic.trim(),
        tone,
        includeHashtags,
        maxLength: 280,
      });

      if (result.success && result.tweet) {
        setContent(result.tweet);
        toast.success("Tweet generated successfully!");
      } else {
        throw new Error(result.error || "Failed to generate tweet");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to generate tweet");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePost = async () => {
    if (!content.trim()) {
      toast.error("Please enter tweet content");
      return;
    }

    if (isOverLimit) {
      toast.error("Tweet exceeds 280 characters");
      return;
    }

    setIsPosting(true);
    try {
      const result = await postTweet(content.trim());
      if (result.success) {
        toast.success("Tweet posted successfully!");
        setContent("");
        setTopic("");
        onTweetSent?.();
      } else {
        throw new Error(result.error || "Failed to post tweet");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to post tweet");
    } finally {
      setIsPosting(false);
    }
  };

  const handleSchedule = async () => {
    if (!content.trim()) {
      toast.error("Please enter tweet content");
      return;
    }

    if (isOverLimit) {
      toast.error("Tweet exceeds 280 characters");
      return;
    }

    if (!scheduleDate || !scheduleTime) {
      toast.error("Please select date and time for scheduling");
      return;
    }

    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`);
    if (scheduledFor <= new Date()) {
      toast.error("Scheduled time must be in the future");
      return;
    }

    setIsScheduling(true);
    try {
      await scheduleTweet(content.trim(), scheduledFor);
      toast.success("Tweet scheduled successfully!");
      setContent("");
      setTopic("");
      setScheduleDate("");
      setScheduleTime("");
      onTweetSent?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to schedule tweet");
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Generation Card */}
      <Card className="glass-card animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Tweet Generator
          </CardTitle>
          <CardDescription>Generate engaging tweets with AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                placeholder="e.g., AI productivity tips, startup growth..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual & Friendly</SelectItem>
                  <SelectItem value="witty">Witty & Humorous</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                  <SelectItem value="informative">Informative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="hashtags"
                checked={includeHashtags}
                onCheckedChange={setIncludeHashtags}
              />
              <Label htmlFor="hashtags">Include hashtags</Label>
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating || !topic.trim()}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tweet Content Card */}
      <Card className="glass-card animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-primary" />
            Compose Tweet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="What's happening?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <div className="flex justify-end">
              <span className={`text-sm ${isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                {characterCount}/280
              </span>
            </div>
          </div>

          {/* Schedule Options */}
          <div className="flex flex-wrap items-end gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-date" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Schedule for
              </Label>
              <div className="flex gap-2">
                <Input
                  id="schedule-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-[150px]"
                />
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-[120px]"
                />
              </div>
            </div>
            <div className="flex flex-1 justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleSchedule}
                disabled={isScheduling || !content.trim() || isOverLimit || !scheduleDate || !scheduleTime}
              >
                {isScheduling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule
                  </>
                )}
              </Button>
              <Button
                onClick={handlePost}
                disabled={isPosting || !content.trim() || isOverLimit}
                className="gradient-primary"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Post Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
