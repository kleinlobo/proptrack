import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that redirect authenticated users away (they don't need them once logged in)
const AUTH_ROUTES = ['/login', '/forgot-password'];
// Routes that are accessible without authentication
const PUBLIC_ROUTES = ['/access-denied', '/auth/confirm', '/set-password', ...AUTH_ROUTES];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — must be called before checking user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Authenticated user hitting an auth page → redirect to dashboard
  if (user && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Unauthenticated user hitting a protected page → redirect to login
  if (!user && !PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
