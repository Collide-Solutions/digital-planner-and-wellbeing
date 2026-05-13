import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(request) {
    if (request.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        if (pathname === '/' || pathname.startsWith('/auth')) return true;
        return !!token;
      }
    },
    pages: {
      signIn: '/auth/login'
    }
  }
);

export const config = {
  matcher: ['/', '/dashboard/:path*', '/tasks/:path*', '/requests/:path*', '/announcements/:path*', '/leave/:path*']
};
