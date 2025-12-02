import { User } from 'next-auth';
import { SUBSCRIPTION_LIMITS, SubscriptionTier, Role } from './db';

// Extend the built-in User type if needed, or define a custom interface
// For now, we assume the User object passed here has the necessary fields
// We might need to extend the NextAuth types globally in a d.ts file

export function isAdmin(user: User | null | undefined): boolean {
    if (!user) return false;
    // Check both the new role field and the legacy isAdmin field
    return (user as any).role === 'admin' || (user as any).isAdmin === true;
}

export function hasAccess(user: User | null | undefined, feature: string): boolean {
    if (!user) return false;
    if (isAdmin(user)) return true;

    const tier = (user as any).subscriptionTier as SubscriptionTier;
    if (!tier || !SUBSCRIPTION_LIMITS[tier]) return false;

    const features = SUBSCRIPTION_LIMITS[tier].features as readonly string[];
    return features.includes('all') || features.includes(feature);
}

export function getMonthlyCredits(tier: SubscriptionTier): number {
    return SUBSCRIPTION_LIMITS[tier]?.credits || 0;
}
