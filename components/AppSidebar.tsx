"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, Settings, Palette, ChevronLeft, ChevronRight, Coins, Sparkles } from 'lucide-react';
import { Home, History, Settings, Palette, ChevronLeft, ChevronRight, Coins, User } from 'lucide-react';
 
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';
import { getCredits } from '../app/actions';

interface AppSidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export function AppSidebar({ isCollapsed, onToggle }: AppSidebarProps) {
    const pathname = usePathname();
    const [credits, setCredits] = useState<number | null>(null);

    const loadCredits = async () => {
        try {
            const c = await getCredits();
            setCredits(c);
        } catch (error) {
            console.error('[AppSidebar] Failed to load credits:', error);
            setCredits(0);
        }
    };

    useEffect(() => {
        loadCredits();

        const handleCreditsUpdate = () => {
            loadCredits();
        };

        window.addEventListener('credits-updated', handleCreditsUpdate);
        return () => window.removeEventListener('credits-updated', handleCreditsUpdate);
    }, []);

    const links = [
        { href: '/', label: 'Generate', icon: Home },
        { href: '/spaces', label: 'Spaces', icon: Sparkles },
        { href: '/history', label: 'History', icon: History },
        { href: '/settings', label: 'Settings', icon: Settings },
        { href: '/user', label: 'Profile', icon: User },
    ];

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card text-card-foreground transition-all duration-300 ease-in-out flex flex-col",
                isCollapsed ? "w-16" : "w-64"
            )}
        >
            {/* Header */}
            <div className={cn("flex items-center h-16 border-b border-border px-4", isCollapsed ? "justify-center" : "justify-between")}>
                {!isCollapsed && (
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary truncate">
                        <Palette className="h-6 w-6 shrink-0" />
                        <span>Booster</span>
                    </Link>
                )}
                {isCollapsed && (
                    <Palette className="h-6 w-6 text-primary shrink-0" />
                )}

                <button
                    onClick={onToggle}
                    className={cn("p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors", !isCollapsed && "ml-auto")}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-2">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                        isCollapsed && "justify-center px-2"
                                    )}
                                    title={isCollapsed ? link.label : undefined}
                                >
                                    <Icon className="h-5 w-5 shrink-0" />
                                    {!isCollapsed && <span>{link.label}</span>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer / Credits */}
            <div className="border-t border-border p-4">
                <div className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 bg-secondary/50 text-secondary-foreground",
                    isCollapsed ? "justify-center px-2 flex-col gap-1" : ""
                )} title="Available Credits">
                    <Coins className="h-5 w-5 shrink-0 text-yellow-500" />
                    {!isCollapsed ? (
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">Credits</span>
                            <span className="text-xs text-muted-foreground">{credits !== null ? credits : '...'} available</span>
                        </div>
                    ) : (
                        <span className="text-[10px] font-bold">{credits !== null ? credits : '...'}</span>
                    )}
                </div>
            </div>
        </aside>
    );
}
