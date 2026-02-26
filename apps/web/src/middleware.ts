import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Content-Security-Policy headers for the web app
 */
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://e-y-api-production.up.railway.app wss://e-y-api-production.up.railway.app https://*.alchemy.com https://api.coingecko.com https://*.coingecko.com https://raw.githubusercontent.com",
  "img-src 'self' data: blob: https://raw.githubusercontent.com https://*.coingecko.com https://assets.coingecko.com",
  "font-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
];

const cspHeader = cspDirectives.join('; ');

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
