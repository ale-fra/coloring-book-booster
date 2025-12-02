import type { NextAuthConfig } from 'next-auth';
import { NextResponse } from 'next/server';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnAuthPage = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register');
            const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth');
            const isPublicRoute = isOnAuthPage || isApiAuthRoute;

            if (isPublicRoute) {
                if (isLoggedIn && isOnAuthPage) {
                    return NextResponse.redirect(new URL('/', nextUrl));
                }
                return true;
            }

            if (!isLoggedIn) {
                return false; // Redirect unauthenticated users to login page
            }

            return true;
        },
    },
    providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
