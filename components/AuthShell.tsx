"use client";

import type { ReactNode } from "react";

import { Palette } from "lucide-react";

interface AuthShellProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/60 px-4 py-12 text-foreground">
      <div className="relative mx-auto w-full max-w-3xl">


        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="bg-gradient-to-r from-primary/10 via-transparent to-transparent px-10 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Coloring Book Generator</p>
                <p className="text-xl font-semibold">Booster</p>
              </div>
            </div>
          </div>

          <div className="px-10 py-8 space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>

            {children}
          </div>

          {footer && (
            <div className="border-t border-border bg-muted/50 px-10 py-6 text-sm text-muted-foreground">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
