import { useState } from "react";
import { Twitter, Settings, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TweetComposer } from "@/components/TweetComposer";
import { ScheduledTweetsList } from "@/components/ScheduledTweetsList";
import { ActivityLogs } from "@/components/ActivityLogs";
import { StatsCards } from "@/components/StatsCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Twitter className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Twitter Bot Agency</h1>
              <p className="text-xs text-muted-foreground">Automated tweet management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse-subtle rounded-full bg-success" />
              <span className="text-sm text-muted-foreground">Connected</span>
            </div>
            <Link to="/analytics">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <BarChart3 className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8">
        <div className="space-y-8">
          {/* Stats */}
          <StatsCards refreshTrigger={refreshTrigger} />

          {/* Main Tabs */}
          <Tabs defaultValue="compose" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="compose">Compose</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="logs">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="space-y-6">
              <TweetComposer onTweetSent={handleRefresh} />
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-6">
              <ScheduledTweetsList refreshTrigger={refreshTrigger} />
            </TabsContent>

            <TabsContent value="logs" className="space-y-6">
              <ActivityLogs refreshTrigger={refreshTrigger} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Twitter Bot Agency • Built with love by{" "}
            <a
              href="https://tendaigumunyu.co.za"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              Tendai Gumunyu
            </a>
          </p>
          <p className="mt-2 text-xs text-muted-foreground/60">
            💡 Set up a cron job to call{" "}
            <code className="rounded bg-muted px-1">
              /process-scheduled
            </code>{" "}
            every minute for automatic posting
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
