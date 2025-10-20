'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/providers/theme';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="flex items-center space-x-2 rounded-lg border p-1 bg-background">
      <button
        onClick={() => setTheme('light')}
        className={cn(
          'flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          theme === 'light'
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-muted'
        )}
        title="亮色模式"
      >
        <Sun className="h-4 w-4" />
        <span className="hidden sm:inline">亮色</span>
      </button>
      
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          'flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          theme === 'dark'
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-muted'
        )}
        title="暗色模式"
      >
        <Moon className="h-4 w-4" />
        <span className="hidden sm:inline">暗色</span>
      </button>
      
      <button
        onClick={() => setTheme('system')}
        className={cn(
          'flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          theme === 'system'
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-muted'
        )}
        title="跟随系统"
      >
        <Monitor className="h-4 w-4" />
        <span className="hidden sm:inline">系统</span>
      </button>
    </div>
  );
}
