'use client';

import { changePassword, updateEmailAddress, type AccountActionState } from '@/app/actions';
import { AlertCircle, CheckCircle2, Loader2, Mail, Shield } from 'lucide-react';
import { useActionState } from 'react';

const initialState: AccountActionState = { status: 'idle', message: '' };

function ActionFeedback({ state }: { state: AccountActionState }) {
    if (!state.message) return null;
    const isSuccess = state.status === 'success';
    const icon = isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />;
    const tone = isSuccess
        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
        : 'text-destructive bg-destructive/10 border-destructive/30';

    return (
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${tone}`}>
            {icon}
            <span>{state.message}</span>
        </div>
    );
}

export function AccountSecurityForms({ currentEmail }: { currentEmail: string }) {
    const [emailState, emailAction, emailPending] = useActionState(updateEmailAddress, initialState);
    const [passwordState, passwordAction, passwordPending] = useActionState(changePassword, initialState);

    return (
        <div className="space-y-4">
            <form action={emailAction} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center gap-3 border-b border-border px-6 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <Mail className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Email address</p>
                        <p className="font-medium">Current: {currentEmail}</p>
                    </div>
                </div>

                <div className="space-y-4 px-6 py-5">
                    <div className="space-y-2">
                        <label htmlFor="new-email" className="text-sm font-medium text-foreground">
                            New email
                        </label>
                        <input
                            id="new-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            defaultValue={currentEmail}
                            required
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                            placeholder="you@new-email.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="email-password" className="text-sm font-medium text-foreground">
                            Confirm with your password
                        </label>
                        <input
                            id="email-password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                            placeholder="********"
                        />
                    </div>

                    <ActionFeedback state={emailState} />

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={emailPending}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                        >
                            {emailPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {emailPending ? 'Updating...' : 'Update email'}
                        </button>
                    </div>
                </div>
            </form>

            <form action={passwordAction} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center gap-3 border-b border-border px-6 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <Shield className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Password</p>
                        <p className="font-medium">Update your sign-in credentials</p>
                    </div>
                </div>

                <div className="space-y-4 px-6 py-5">
                    <div className="space-y-2">
                        <label htmlFor="current-password" className="text-sm font-medium text-foreground">
                            Current password
                        </label>
                        <input
                            id="current-password"
                            name="currentPassword"
                            type="password"
                            autoComplete="current-password"
                            required
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                            placeholder="********"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="new-password" className="text-sm font-medium text-foreground">
                                New password
                            </label>
                            <input
                                id="new-password"
                                name="newPassword"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                                placeholder="At least 6 characters"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                                Confirm new password
                            </label>
                            <input
                                id="confirm-password"
                                name="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                                placeholder="Match the new password"
                            />
                        </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        Use a unique password you have not used elsewhere. Updating your password will secure access to your saved presets and history.
                    </p>

                    <ActionFeedback state={passwordState} />

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={passwordPending}
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-60"
                        >
                            {passwordPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {passwordPending ? 'Saving...' : 'Change password'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
