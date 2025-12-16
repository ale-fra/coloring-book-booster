import { auth } from '@/auth';
import { logout } from '@/app/actions';
import { redirect } from 'next/navigation';
import { LogOut, User as UserIcon } from 'lucide-react';
import { AccountSecurityForms } from '@/components/AccountSecurityForms';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default async function UserPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const sessionUser = session.user as { id?: string; email?: string };
    const userRecord = sessionUser.id
        ? await db.query.users.findFirst({ where: eq(users.id, sessionUser.id) })
        : sessionUser.email
            ? await db.query.users.findFirst({ where: eq(users.email, sessionUser.email) })
            : null;

    if (!userRecord) {
        redirect('/login');
    }

    const userEmail = userRecord.email ?? sessionUser.email ?? 'Unknown user';
    const credits = userRecord.credits ?? 0;

    return (
        <div className="h-screen overflow-y-auto bg-background">
            <div className="max-w-6xl mx-auto px-6 py-8 md:py-12 space-y-8">
                <section className="rounded-2xl border border-border bg-card shadow-sm">
                    <div className="flex items-center gap-4 border-b border-border px-6 py-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <UserIcon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Account</p>
                            <h1 className="text-3xl font-bold leading-tight">Profile</h1>
                            <p className="text-sm text-muted-foreground">Update your account and billing basics.</p>
                        </div>
                    </div>

                    <div className="grid gap-4 px-6 py-5 md:grid-cols-3">
                        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="font-semibold break-words">{userEmail}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-1">
                            <p className="text-xs text-muted-foreground">Credits</p>
                            <p className="font-semibold text-foreground">{credits} remaining</p>
                            <p className="text-xs text-muted-foreground">Reset schedule: coming soon</p>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-2">
                            <div>
                                <p className="text-xs text-muted-foreground">Subscription</p>
                                <p className="font-semibold text-foreground">Not set (coming soon)</p>
                            </div>
                            <button
                                type="button"
                                disabled
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground disabled:opacity-70"
                                title="Manage subscription coming soon"
                            >
                                Manage subscription (coming soon)
                            </button>
                        </div>
                    </div>
                </section>

                <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="space-y-6">
                        <AccountSecurityForms currentEmail={userEmail} />
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
                            <h3 className="text-base font-semibold text-foreground">Actions</h3>
                            <form action={logout}>
                                <button
                                    type="submit"
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Sign out securely
                                </button>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
