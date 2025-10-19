// Console warning suppressor for development
// This file reduces console clutter from third-party libraries

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const originalWarn = console.warn;
  const originalError = console.error;

  // List of warnings to suppress
  const suppressPatterns = [
    /Lit is in dev mode/,
    /link preload but not used/,
    /Reown Config/,
    /Failed to fetch remote/,
    /cca-lite\.coinbase\.com/,
    /pulse\.walletconnect\.org/,
    /api\.web3modal\.org/,
    /Cross-Origin-Opener-Policy/,
    /HTTP error! status: 404/,
  ];

  // Suppress specific console warnings
  console.warn = (...args) => {
    const message = args.join(' ');
    if (suppressPatterns.some(pattern => pattern.test(message))) {
      return; // Suppress this warning
    }
    originalWarn.apply(console, args);
  };

  // Suppress specific console errors that are actually warnings
  console.error = (...args) => {
    const message = args.join(' ');
    if (suppressPatterns.some(pattern => pattern.test(message))) {
      return; // Suppress this error
    }
    originalError.apply(console, args);
  };

  // Suppress network errors from analytics
  if (window.fetch) {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        return await originalFetch(...args);
      } catch (error) {
        const url = args[0]?.toString() || '';
        // Suppress analytics/metrics errors
        if (
          url.includes('cca-lite.coinbase.com') ||
          url.includes('pulse.walletconnect.org') ||
          url.includes('api.web3modal.org')
        ) {
          console.log(`[Suppressed] Analytics request failed: ${url}`);
          return new Response(JSON.stringify({}), { status: 200 });
        }
        throw error;
      }
    };
  }

  console.log(
    '%c🧹 Console Cleanup Active',
    'background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
    '\nSuppressing non-critical warnings from third-party libraries'
  );
}

export {};