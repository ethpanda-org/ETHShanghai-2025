'use client'
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { getMyApps, type AppItem } from '@/services/vibe3_api/apps';
import Link from 'next/link';
import { Header } from '@/components/header';
import { StarfieldBg } from '@/components/starfield-bg';
import PromptInput from '@/components/home-prompt-input';


export default function Home() {
  const { user } = useAuth();
  const [apps, setApps] = useState<AppItem[]>([]);

  useEffect(() => {
    if (user) {
      console.log(user);
      getMyApps().then((res) => {
        if (res.success) {
          setApps(res.data.apps);
        }
      });
    }
  }, [user]);

  return (
    <div className="min-h-screen font-sans bg-background text-foreground">
      <StarfieldBg />
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full mx-auto">
          {/* Welcome Section */}
          <div className="relative mb-8 h-[calc(100svh-300px)] min-h-[300px] rounded-lg overflow-auto">
            <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  Building apps easily by <span className="text-green-400">[Vibe3]</span>
                </h1>
                <p className="text text-muted-foreground font-mono">
                  Change your idea into apps in seconds via AI Assistant
                </p>
              </div>

             <div className="max-w-[600px] w-full">
               <PromptInput  
                 placeholderTexts={[
                   'Build a calculator...',
                   'Help me build a website...',
                   'Build a blog website...',
                   'Create a todo list...',
                   'Develop a weather application...'
                 ]}
               />
             </div>
            </div>
          </div>

          {/* Apps Section */}
          {apps.length > 0 && (
            <div className="space-y-6  z-10 relative p-4 rounded-lg bg-background/50 border border-primary/20">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-foreground">My Apps</h2>
                <div className="text-sm text-muted-foreground">
                  Total {apps.length} apps
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {apps.map((app) => (
                  <Link
                    href={`/app/${app.id}`}
                    key={app.id}
                    className="group block p-6 bg-card/80 border rounded-lg hover:shadow-md transition-all duration-200 hover:border-primary/50"
                  >
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {app.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        ID: {app.id}
                      </p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span>Continue</span>
                        <svg className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>)}
        </div>
      </main>
    </div>
  );
}
