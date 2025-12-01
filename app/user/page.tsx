import { auth } from '@/auth';
import { logout } from '@/app/actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Mail, Sparkles, User as UserIcon } from 'lucide-react';

export default async function UserPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    return (
        <div className="p-8 md:p-12 max-w-5xl mx-auto space-y-8">
            <header className="space-y-2">
                <p className="text-sm text-muted-foreground">Account</p>
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <UserIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Profile & Access</h1>
                        <p className="text-muted-foreground">Manage your Booster account and session preferences.</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-4">
                    <div className="rounded-xl border border-border bg-card shadow-sm">
                        <div className="flex items-center justify-between border-b border-border px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                                    <Mail className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Signed in as</p>
                                    <p className="font-medium">{session.user.email}</p>
                                </div>
                            </div>
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Active</span>
                        </div>
                        <div className="space-y-3 px-6 py-5 text-sm text-muted-foreground">
                            <p>Your session gives you access to generation, history, and settings. For security, sign out when you finish working on shared devices.</p>
                            <p>Want to adjust your preferences? Use the settings page to manage model defaults, credits, and integrations.</p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-muted/40 px-6 py-5">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <p>Stay signed in while exploring Booster, or sign out if you need to switch accounts.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <Link
                        href="/"
                        className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        Return to Generator
                    </Link>

                    <form action={logout}>
                        <button
                            type="submit"
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign out securely
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
