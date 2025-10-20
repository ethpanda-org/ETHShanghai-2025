export async function logClientError(source: string, error: unknown, extra?: Record<string, unknown>) {
  try {
    // 同时输出到浏览器 console 和服务器
    console.error('[ClientError]', source, error, extra)
    const payload = {
      source,
      message: (error as any)?.message ?? String(error),
      stack: (error as any)?.stack,
      extra: extra ?? {},
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      time: new Date().toISOString(),
    }
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // swallow
  }
}


