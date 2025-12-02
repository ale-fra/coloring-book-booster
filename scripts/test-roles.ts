
import { isAdmin, hasAccess, getMonthlyCredits } from '../lib/auth-utils';
import { SUBSCRIPTION_LIMITS } from '../lib/db';

const mockAdmin = {
    id: '1',
    role: 'admin',
    subscriptionTier: 'max',
    credits: 1000,
    isAdmin: true
};

const mockMemberStarter = {
    id: '2',
    role: 'member',
    subscriptionTier: 'starter',
    credits: 100,
    isAdmin: false
};

const mockMemberPro = {
    id: '3',
    role: 'member',
    subscriptionTier: 'pro',
    credits: 500,
    isAdmin: false
};

console.log('Testing Admin Role:');
console.log('isAdmin(mockAdmin):', isAdmin(mockAdmin as any)); // Should be true
console.log('hasAccess(mockAdmin, "advanced"):', hasAccess(mockAdmin as any, "advanced")); // Should be true

console.log('\nTesting Member Starter:');
console.log('isAdmin(mockMemberStarter):', isAdmin(mockMemberStarter as any)); // Should be false
console.log('hasAccess(mockMemberStarter, "basic"):', hasAccess(mockMemberStarter as any, "basic")); // Should be true
console.log('hasAccess(mockMemberStarter, "advanced"):', hasAccess(mockMemberStarter as any, "advanced")); // Should be false
console.log('getMonthlyCredits("starter"):', getMonthlyCredits("starter")); // Should be 100

console.log('\nTesting Member Pro:');
console.log('hasAccess(mockMemberPro, "advanced"):', hasAccess(mockMemberPro as any, "advanced")); // Should be true
console.log('getMonthlyCredits("pro"):', getMonthlyCredits("pro")); // Should be 500

console.log('\nVerification Complete.');
