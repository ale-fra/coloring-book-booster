import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function getUser(email: string) {
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });
        return user;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user) return null;

                    if (!user.passwordHash) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
                    if (passwordsMatch) {
                        const { id, email: userEmail, isAdmin, role, subscriptionTier, credits, lastLoginAt, createdAt, updatedAt } = user;

                        return {
                            id,
                            email: userEmail,
                            isAdmin: isAdmin ?? false,
                            role,
                            subscriptionTier,
                            credits: credits ?? 0,
                            lastLoginAt,
                            createdAt,
                            updatedAt,
                        };
                    }
                }

                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
                token.subscriptionTier = (user as any).subscriptionTier;
                token.credits = (user as any).credits;
                token.isAdmin = (user as any).isAdmin;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string;
                session.user.role = token.role as any;
                session.user.subscriptionTier = token.subscriptionTier as any;
                session.user.credits = token.credits as number;
                session.user.isAdmin = token.isAdmin as boolean;
            }
            return session;
        },
    },
});
