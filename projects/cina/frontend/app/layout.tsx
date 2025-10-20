'use client';
import './globals.css';
import Providers from '../components/Providers';
import { gsap } from "gsap";
import ErrorSuppressor from '../components/ErrorSuppressor';
import BackRefreshHandler from '../components/BackRefreshHandler';


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <title>CINA</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/support/cina-logo-white.svg" type="image/svg+xml" />
        <script src="/error-handler.js" />
      </head>
      <body>
        <ErrorSuppressor />
        <BackRefreshHandler />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
