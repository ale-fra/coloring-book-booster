export { auth as middleware } from './auth';

export const config = {
    // Protect all application routes and API handlers except for NextAuth endpoints and static assets.
    matcher: [
        '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)',
        '/api/(?!auth).*',
    ],
};
