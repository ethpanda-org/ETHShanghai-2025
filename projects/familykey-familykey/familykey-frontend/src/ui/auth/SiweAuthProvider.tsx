import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { SiweMessage } from 'siwe';
import { apiUrl } from '../../config/api';

type SessionUser = {
  id: string;
  address: string;
  email?: string | null;
};

type Session = {
  address: string;
  user: SessionUser;
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  refreshTokenExpiresAt: number;
};

type NonceResponse = {
  nonce: string;
  expiresAt: string;
  domain: string;
  statement: string;
  uri: string;
  chainId: number;
};

type AuthTokensResponse = {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: SessionUser;
};

type SiweAuthContextValue = {
  session: Session | null;
  isReady: boolean;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  lastError: string | null;
  authenticate: (options?: { force?: boolean; address?: string }) => Promise<Session>;
  signOut: (options?: { revoke?: boolean }) => Promise<void>;
  ensureAccessToken: (options?: { forceRefresh?: boolean }) => Promise<string>;
  authorizedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  clearError: () => void;
};

const STORAGE_KEY = 'fk.siwe.session';
const TOKEN_SAFETY_WINDOW_MS = 30_000;

const SiweAuthContext = createContext<SiweAuthContextValue | undefined>(undefined);

const isBrowser = () => typeof window !== 'undefined';

function addressesEqual(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

function loadStoredSession(): Session | null {
  if (!isBrowser()) {
    return null;
  }
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Session;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    if (
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.refreshToken !== 'string' ||
      typeof parsed.address !== 'string' ||
      typeof parsed.accessTokenExpiresAt !== 'number' ||
      typeof parsed.refreshTokenExpiresAt !== 'number'
    ) {
      return null;
    }
    if (!parsed.user || typeof parsed.user.address !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function mapTokensToSession(tokens: AuthTokensResponse): Session {
  const now = Date.now();
  const refreshTokenExpiresAt = new Date(tokens.refreshTokenExpiresAt).getTime();
  if (!Number.isFinite(refreshTokenExpiresAt)) {
    throw new Error('Invalid refresh token expiry received from server.');
  }
  const expiresInMs = Math.max(tokens.accessTokenExpiresIn * 1000 - TOKEN_SAFETY_WINDOW_MS, 5_000);
  return {
    address: tokens.user.address,
    user: tokens.user,
    accessToken: tokens.accessToken,
    accessTokenExpiresAt: now + expiresInMs,
    refreshToken: tokens.refreshToken,
    refreshTokenExpiresAt,
  };
}

function readErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error) {
    return error;
  }
  return fallback;
}

export function SiweAuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [session, setSession] = useState<Session | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const refreshPromiseRef = useRef<Promise<Session> | null>(null);

  // Debug: log wagmi state
  useEffect(() => {
    console.log('[SiweAuth] Wagmi 状态：', { address, isConnected, hasSignMessageAsync: !!signMessageAsync });
  }, [address, isConnected, signMessageAsync]);

  useEffect(() => {
    const stored = loadStoredSession();
    if (stored && stored.refreshTokenExpiresAt > Date.now()) {
      setSession(stored);
    } else if (stored && stored.refreshTokenExpiresAt <= Date.now() && isBrowser()) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated || !isBrowser()) {
      return;
    }
    if (!session) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }, [session, hasHydrated]);

  const clearError = useCallback(() => setLastError(null), []);

  const signOut = useCallback(
    async ({ revoke = true }: { revoke?: boolean } = {}) => {
      const refreshToken = session?.refreshToken;
      setSession(null);
      setLastError(null);
      refreshPromiseRef.current = null;
      if (!revoke || !refreshToken) {
        return;
      }
      try {
        await fetch(apiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Swallow logout errors – session is already cleared locally.
      }
    },
    [session]
  );

  useEffect(() => {
    if (!session || !address) {
      return;
    }
    if (!addressesEqual(session.address, address)) {
      void signOut({ revoke: true });
    }
  }, [address, session, signOut]);

  const refreshSession = useCallback(async () => {
    if (!session) {
      throw new Error('Not authenticated');
    }
    if (session.refreshTokenExpiresAt <= Date.now() + TOKEN_SAFETY_WINDOW_MS) {
      await signOut({ revoke: false });
      const message = 'Session expired, please sign in again.';
      setLastError(message);
      throw new Error(message);
    }
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const pending = (async () => {
      const res = await fetch(apiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok || !data) {
        const message = readErrorMessage(data?.error, 'Unable to refresh session.');
        await signOut({ revoke: false });
        setLastError(message);
        throw new Error(message);
      }
      const next = mapTokensToSession(data as AuthTokensResponse);
      if (!addressesEqual(next.address, session.address)) {
        await signOut({ revoke: false });
        const message = 'Authenticated address mismatch during refresh.';
        setLastError(message);
        throw new Error(message);
      }
      setSession(next);
      setLastError(null);
      return next;
    })().finally(() => {
      refreshPromiseRef.current = null;
    });

    refreshPromiseRef.current = pending;
    return pending;
  }, [session, signOut]);

  const ensureAccessToken = useCallback(
    async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
      if (!session) {
        throw new Error('Not authenticated');
      }
      const timeRemaining = session.accessTokenExpiresAt - Date.now();
      if (!forceRefresh && timeRemaining > TOKEN_SAFETY_WINDOW_MS) {
        return session.accessToken;
      }
      const refreshed = await refreshSession();
      return refreshed.accessToken;
    },
    [session, refreshSession]
  );

  const authenticate = useCallback(
    async ({ force = true, address: addressOverride }: { force?: boolean; address?: string } = {}) => {
      const targetAddress = addressOverride || address;
      console.log('[SiweAuth] authenticate 调用，参数：', { force, addressOverride, address, targetAddress });
      if (!targetAddress) {
        throw new Error('Connect a wallet before signing in.');
      }
      if (!force && session && addressesEqual(session.address, targetAddress)) {
        await ensureAccessToken();
        return session;
      }
      setIsAuthenticating(true);
      setLastError(null);
      try {
        console.log('[SiweAuth] 请求 nonce，地址：', targetAddress);
        const nonceRes = await fetch(apiUrl('/api/auth/nonce'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: targetAddress }),
        });
        const nonceJson = await nonceRes.json().catch(() => ({} as any));
        console.log('[SiweAuth] nonce 响应：', { ok: nonceRes.ok, status: nonceRes.status, data: nonceJson });
        if (!nonceRes.ok || !nonceJson?.nonce) {
          throw new Error(readErrorMessage(nonceJson?.error, 'Unable to request SIWE nonce.'));
        }
        const nonceData = nonceJson as NonceResponse;
        const message = new SiweMessage({
          domain: nonceData.domain,
          address: targetAddress,
          statement: nonceData.statement,
          uri: nonceData.uri,
          version: '1',
          chainId: nonceData.chainId,
          nonce: nonceData.nonce,
        });
        const preparedMessage = message.prepareMessage();
        console.log('[SiweAuth] 准备签名消息：', preparedMessage);
        console.log('[SiweAuth] signMessageAsync 函数：', typeof signMessageAsync, signMessageAsync);
        console.log('[SiweAuth] 当前连接状态：', { address, isConnected });
        console.log('[SiweAuth] 正在请求用户签名...');

        let signature: string;
        try {
          signature = await signMessageAsync({ message: preparedMessage });
          console.log('[SiweAuth] 签名成功，签名值长度：', signature?.length);
        } catch (signError) {
          console.error('[SiweAuth] 签名失败：', signError);
          throw signError;
        }

        console.log('[SiweAuth] 正在验证签名...');
        const verifyRes = await fetch(apiUrl('/api/auth/verify'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: preparedMessage, signature }),
        });
        const verifyJson = await verifyRes.json().catch(() => ({} as any));
        console.log('[SiweAuth] 验证响应：', { ok: verifyRes.ok, status: verifyRes.status, hasToken: !!verifyJson?.accessToken });
        if (!verifyRes.ok || !verifyJson?.accessToken) {
          throw new Error(readErrorMessage(verifyJson?.error, 'SIWE verification failed.'));
        }
        const tokens = verifyJson as AuthTokensResponse;
        if (!addressesEqual(tokens.user.address, targetAddress)) {
          throw new Error('Authenticated address does not match connected wallet.');
        }
        const next = mapTokensToSession(tokens);
        setSession(next);
        setLastError(null);
        console.log('[SiweAuth] 认证完成');
        return next;
      } catch (error) {
        console.error('[SiweAuth] 认证错误：', error);
        const message = readErrorMessage(error, 'Unable to sign in with Ethereum.');
        setLastError(message);
        throw new Error(message);
      } finally {
        setIsAuthenticating(false);
      }
    },
    [address, session, ensureAccessToken, signMessageAsync]
  );

  const authorizedFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const attempt = async (forceRefresh: boolean) => {
        const token = await ensureAccessToken({ forceRefresh });
        const headers = new Headers(init?.headers ?? {});
        headers.set('Authorization', `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      };

      let response: Response;
      try {
        response = await attempt(false);
      } catch (error) {
        const message = readErrorMessage(error, 'Unable to complete request.');
        setLastError(message);
        throw new Error(message);
      }
      if (response.status === 401 || response.status === 403) {
        try {
          response = await attempt(true);
        } catch (error) {
          await signOut({ revoke: false });
          const message = readErrorMessage(error, 'Session expired, please sign in again.');
          setLastError(message);
          throw new Error(message);
        }
        if (response.status === 401 || response.status === 403) {
          await signOut({ revoke: false });
          const message = 'Session expired, please sign in again.';
          setLastError(message);
          throw new Error(message);
        }
      }
      return response;
    },
    [ensureAccessToken, signOut]
  );

  const value = useMemo<SiweAuthContextValue>(
    () => ({
      session,
      isReady: hasHydrated,
      isAuthenticated: !!session,
      isAuthenticating,
      lastError,
      authenticate,
      signOut,
      ensureAccessToken,
      authorizedFetch,
      clearError,
    }),
    [
      session,
      hasHydrated,
      isAuthenticating,
      lastError,
      authenticate,
      signOut,
      ensureAccessToken,
      authorizedFetch,
      clearError,
    ]
  );

  return <SiweAuthContext.Provider value={value}>{children}</SiweAuthContext.Provider>;
}

export function useSiweAuth() {
  const ctx = useContext(SiweAuthContext);
  if (!ctx) {
    throw new Error('useSiweAuth must be used within SiweAuthProvider');
  }
  return ctx;
}
