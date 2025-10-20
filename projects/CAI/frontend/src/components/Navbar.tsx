import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">CAI Framework</span>
            </Link>
            <div className="hidden space-x-4 md:flex">
              <Link
                href="/"
                className="px-3 py-2 text-sm font-medium text-gray-700 transition hover:text-primary-600"
              >
                Dashboard
              </Link>
              <Link
                href="/audit"
                className="px-3 py-2 text-sm font-medium text-gray-700 transition hover:text-primary-600"
              >
                Audit
              </Link>
              <Link
                href="/docs"
                className="px-3 py-2 text-sm font-medium text-gray-700 transition hover:text-primary-600"
              >
                Docs
              </Link>
            </div>
          </div>
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}
