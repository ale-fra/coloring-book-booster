'use client';

import { useActionState, useEffect } from 'react';
import { authenticate } from '@/app/actions';
import Link from 'next/link';
import { AuthShell } from '@/components/AuthShell';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [errorMessage, formAction, isPending] = useActionState(
        authenticate,
        undefined,
    );
    const router = useRouter();

    useEffect(() => {
        if (errorMessage === 'success') {
            router.push('/');
        }
    }, [errorMessage, router]);

    return (
        <AuthShell
            title="Sign in to Booster"
            description="Access your saved prompts, history, and coloring book presets."
            footer={(
                <div className="flex items-center justify-between">
                    <span className="text-foreground">New to Booster?</span>
                    <Link href="/register" className="font-medium text-primary hover:text-primary/80">
                        Create an account
                    </Link>
                </div>
            )}
        >
            <form action={formAction} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="email-address" className="text-sm font-medium text-foreground">
                        Email address
                    </label>
                    <input
                        id="email-address"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                        placeholder="you@example.com"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-foreground">
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                        placeholder="••••••••"
                    />
                </div>

                <div className="space-y-3 pt-2">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                    >
                        {isPending ? 'Signing in...' : 'Sign in'}
                    </button>

                    {errorMessage && errorMessage !== 'success' && (
                        <p className="text-sm text-destructive" aria-live="polite" aria-atomic="true">
                            {errorMessage}
                        </p>
                    )}
                </div>
            </form>
        </AuthShell>
    );
}
