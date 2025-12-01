import { auth } from "./auth";

export default auth;

export const config = {
    // Protect all application routes and API handlers except for NextAuth endpoints and static assets.
    matcher: [
        '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)',
    ],
};
