import { useState, useEffect } from "react";
import {
  ExternalLink,
  Users,
  Gift,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuestData {
  project: string;
  title: string;
  reward: string;
  participants: string | null;
  image: string;
  link: string;
}

const QuestAskPage = () => {
  const [quests, setQuests] = useState<QuestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadQuests = async () => {
      try {
        const response = await fetch('/galxe.json');
        if (!response.ok) {
          throw new Error('Failed to load quest data');
        }
        const data = await response.json();
        setQuests(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadQuests();
  }, []);

  const copyToClipboard = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLinks(prev => new Set(prev).add(link));
      setTimeout(() => {
        setCopiedLinks(prev => {
          const newSet = new Set(prev);
          newSet.delete(link);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="h-48 bg-muted/50" />
                <div className="p-6 space-y-4">
                  <div className="h-4 bg-muted/50 rounded w-3/4" />
                  <div className="h-3 bg-muted/50 rounded w-1/2" />
                  <div className="h-3 bg-muted/50 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Quest
          </h1>
          <p className="text-muted-foreground">
            Discover and participate in various quests to earn rewards.
          </p>
        </header>
        <div className="text-center py-12">
          <p className="text-destructive">Error loading quest data: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-6 lg:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Quest
        </h1>
        <p className="text-muted-foreground">
          Discover and participate in various quests to earn rewards.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quests.map((quest, index) => {
          const participantsLabel = quest.participants
            ? `${quest.participants} participants`
            : "Be among the first to join";

          return (
            <article
              key={index}
              className="flex h-full flex-col rounded-2xl border border-border bg-background/80 p-6 transition hover:bg-background"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500">
                      <span className="sr-only">Active</span>
                    </span>
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {quest.project}
                    </p>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground leading-tight">
                    {quest.title}
                  </h3>
                </div>
                <div className="flex shrink-0">
                  <div className="relative w-16 h-16 overflow-hidden rounded-xl border border-border/60 bg-muted">
                    <img
                      src={quest.image}
                      alt={quest.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src =
                          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y4X2ZhZmUiIHJ4PSI4Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZpbGw9IiM4Yzg3OTgiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==";
                      }}
                    />
                  </div>
                </div>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                Quest Activity · {quest.project} Project
              </p>

              <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary/70" />
                  <span>{participantsLabel}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-emerald-500" />
                  <span>奖励：{quest.reward}</span>
                </div>
              </div>

              <div className="mt-auto flex items-center gap-3 pt-6">
                <Button
                  asChild
                  size="sm"
                  className="flex-1 gap-2 rounded-xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-white transition-shadow hover:shadow-[0_8px_20px_rgba(59,130,246,0.25)]"
                >
                  <a
                    href={quest.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Join Quest
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(quest.link)}
                  className="h-9 w-9 rounded-xl border-border/60 p-0 hover:bg-muted/60"
                >
                  {copiedLinks.has(quest.link) ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default QuestAskPage;
