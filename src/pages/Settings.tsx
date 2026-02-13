import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Settings as SettingsIcon, Save, Loader2, ArrowLeft, Hash, MessageSquare, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface BotSettings {
  default_tone: string;
  default_hashtags: string;
  include_hashtags: boolean;
  max_posts_per_day: number;
  posting_interval_minutes: number;
  auto_generate: boolean;
  default_topics: string;
}

const DEFAULT_SETTINGS: BotSettings = {
  default_tone: "professional",
  default_hashtags: "",
  include_hashtags: true,
  max_posts_per_day: 10,
  posting_interval_minutes: 60,
  auto_generate: false,
  default_topics: "",
};

export default function Settings() {
  const [settings, setSettings] = useState<BotSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("bot_config")
        .select("*");

      if (error) throw error;

      if (data && data.length > 0) {
        const loaded: Partial<BotSettings> = {};
        for (const row of data) {
          if (row.key in DEFAULT_SETTINGS) {
            const key = row.key as keyof BotSettings;
            const defaultVal = DEFAULT_SETTINGS[key];
            if (typeof defaultVal === "boolean") {
              (loaded as any)[key] = row.value === "true";
            } else if (typeof defaultVal === "number") {
              (loaded as any)[key] = parseInt(row.value, 10) || defaultVal;
            } else {
              (loaded as any)[key] = row.value;
            }
          }
        }
        setSettings({ ...DEFAULT_SETTINGS, ...loaded });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const entries = Object.entries(settings).map(([key, value]) => ({
        key,
        value: String(value),
      }));

      for (const entry of entries) {
        const { error } = await supabase
          .from("bot_config")
          .upsert({ key: entry.key, value: entry.value }, { onConflict: "key" });
        if (error) throw error;
      }

      toast.success("Settings saved successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center gap-4 px-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">Bot Settings</h1>
            <p className="text-xs text-muted-foreground">Configure your bot's behavior</p>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Tone & Content */}
          <Card className="glass-card animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
                Content Defaults
              </CardTitle>
              <CardDescription>Set default tone and content preferences for generated tweets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Default Tone</Label>
                <Select value={settings.default_tone} onValueChange={(v) => setSettings((s) => ({ ...s, default_tone: v }))}>
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>Default Topics</Label>
                <Input
                  placeholder="e.g., AI, startups, productivity (comma separated)"
                  value={settings.default_topics}
                  onChange={(e) => setSettings((s) => ({ ...s, default_topics: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Used as default topics for AI tweet generation</p>
              </div>
            </CardContent>
          </Card>

          {/* Hashtags */}
          <Card className="glass-card animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Hash className="h-5 w-5 text-primary" />
                Hashtag Preferences
              </CardTitle>
              <CardDescription>Control how hashtags are used in your tweets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Include Hashtags by Default</Label>
                  <p className="text-xs text-muted-foreground">AI-generated tweets will include relevant hashtags</p>
                </div>
                <Switch
                  checked={settings.include_hashtags}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, include_hashtags: v }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Default Hashtags</Label>
                <Input
                  placeholder="e.g., #AI #startup #tech (space separated)"
                  value={settings.default_hashtags}
                  onChange={(e) => setSettings((s) => ({ ...s, default_hashtags: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">These hashtags will be appended to generated tweets</p>
              </div>
            </CardContent>
          </Card>

          {/* Posting Frequency */}
          <Card className="glass-card animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-primary" />
                Posting Frequency
              </CardTitle>
              <CardDescription>Control how often the bot posts tweets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Max Posts Per Day</Label>
                  <span className="text-sm font-medium text-primary">{settings.max_posts_per_day}</span>
                </div>
                <Slider
                  value={[settings.max_posts_per_day]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, max_posts_per_day: v }))}
                  min={1}
                  max={50}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">Maximum number of tweets the bot will post per day</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Minimum Interval Between Posts</Label>
                  <span className="text-sm font-medium text-primary">{settings.posting_interval_minutes} min</span>
                </div>
                <Slider
                  value={[settings.posting_interval_minutes]}
                  onValueChange={([v]) => setSettings((s) => ({ ...s, posting_interval_minutes: v }))}
                  min={5}
                  max={360}
                  step={5}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Generate Content</Label>
                  <p className="text-xs text-muted-foreground">Automatically generate and schedule tweets using AI</p>
                </div>
                <Switch
                  checked={settings.auto_generate}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, auto_generate: v }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={isSaving} className="w-full gradient-primary" size="lg">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
