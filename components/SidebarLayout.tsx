"use client";

import { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { cn } from '../lib/utils';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);

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
