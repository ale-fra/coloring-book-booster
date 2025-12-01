"use client";

import { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { cn } from '../lib/utils';
import { usePathname } from 'next/navigation';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');

    console.log('[SidebarLayout] Pathname:', pathname);
    console.log('[SidebarLayout] isAuthPage:', isAuthPage);

    if (isAuthPage) {
        return <>{children}</>;
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
