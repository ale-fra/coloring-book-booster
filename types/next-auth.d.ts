import NextAuth, { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { Role, SubscriptionTier } from '@/lib/db';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            role: Role;
            subscriptionTier: SubscriptionTier;
            credits: number;
            isAdmin: boolean;
        } & DefaultSession['user'];
    }

    interface User {
        role: Role;
        subscriptionTier: SubscriptionTier;
        credits: number;
        isAdmin: boolean;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        role: Role;
        subscriptionTier: SubscriptionTier;
        credits: number;
        isAdmin: boolean;
    }
}
