"use client";

import type { ReactNode } from 'react';
import { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { cn } from '../lib/utils';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export function SidebarLayout({ children }: { children: ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const { status } = useSession();
    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');
    const isProfilePage = pathname?.startsWith('/user');
    const shouldHideSidebar = isAuthPage || status !== 'authenticated';

    if (shouldHideSidebar || isProfilePage) {
        return <div className="min-h-screen bg-background text-foreground">{children}</div>;
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <AppSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
            <main
                className={cn(
                    "flex-1 transition-all duration-300 ease-in-out flex flex-col h-screen overflow-hidden",
                    isCollapsed ? "ml-16" : "ml-64"
                )}
            >
                {children}
            </main>
        </div>
    );
}
