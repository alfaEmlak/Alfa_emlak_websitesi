import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export function proxy(request: import('next/server').NextRequest) {
  return intlMiddleware(request);
}

export const config = {
  // Match only internationalized pathnames
  // But explicitly exclude karealfaadmin and api routes
  matcher: ['/', '/(tr|en|ru|de|fa)/:path*', '/((?!api|_next|_vercel|karealfaadmin|.*\\..*).*)']
};
