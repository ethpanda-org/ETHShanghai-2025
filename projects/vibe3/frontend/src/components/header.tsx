'use client';

import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { logout } from '@/services/vibe3_api/auth';
import { useState } from 'react';
import Link from 'next/link';

export function Header() {
  const { user, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  const shortAddress = (address: string) => {
    return address.slice(0, 6) + '...' + address.slice(-4);
  }

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-2xl font-bold text-green-400">[ Vibe3 ]</Link>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6 ml-6 text-sm font-mono">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Docs
              </Link>
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Examples
              </Link>
            </nav>
          </div>



          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* User Section */}
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </div>
            ) : user ? (
              <Popover>
                <PopoverTrigger asChild>
                  <div className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 rounded-md p-1 transition-colors">
                    <Avatar
                      name={user.nickname || user.email || 'User'}
                      size="sm"
                      url={user.avatar}
                    />
                    <div className="hidden sm:block">
                      <div className="text-sm font-medium text-foreground">
                        {user.nickname || user.email?.split('@')[0] || 'User'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.email || shortAddress(user.eth_address || '')}
                      </div>
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    {/* User Info */}
                    <div className="flex items-center space-x-3">
                      <Avatar
                        name={user.nickname || user.email || 'User'}
                        size="md"
                        url={user.avatar}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {user.nickname || user.email?.split('@')[0] || 'User'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.email || shortAddress(user.eth_address || '')}
                        </div>
                      </div>
                    </div>

                    {/* Logout Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleLogout}
                    >
                      Logout
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => { location.href = '/login' }}>
                  Login
                </Button>
                <Button variant="outline" size="sm" className="!text-green-400 cursor-pointer" onClick={() => { location.href = '/register' }}>
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/"
                className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                首页
              </Link>
              <Link
                href="/settings"
                className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                设置
              </Link>

              {user && (
                <>
                  <div className="border-t my-2" />
                  <div className="px-3 py-2">
                    <div className="flex items-center space-x-3">
                      <Avatar
                        name={user.nickname || user.email || 'User'}
                        size="sm"
                        url={user.avatar}
                      />
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {user.nickname || user.email?.split('@')[0] || 'User'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full justify-start mx-3 mb-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    创建应用
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start mx-3"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    退出登录
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
