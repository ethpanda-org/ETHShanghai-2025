import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 仅保留健康检查，无鉴权直通
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 保留默认匹配以便未来扩展；当前逻辑不会进行鉴权
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
