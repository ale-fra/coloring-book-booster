"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getHistory, deleteHistoryItem, clearHistory } from '@/app/actions';
import { type HistoryItem } from '@/lib/db';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Calendar, Layers, Sparkles, Trash2 } from 'lucide-react';

export default function HistoryPage() {
    const router = useRouter();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const items = await getHistory();
            setHistory(items.sort((a: HistoryItem, b: HistoryItem) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } catch (error) {
            console.error("Failed to load history:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoad = (item: HistoryItem) => {
        // In a real app, we might use a context or URL params to pass this data.
        // For now, we'll use localStorage to pass the ID to the home page, 
        // or we could just navigate and let the user manually load?
        // Actually, let's just navigate for now and maybe implement a "load from history" param later.
        // Or better, we can use a query param ?historyId=...
        router.push(`/?historyId=${item.id}`);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this history item?')) {
            await deleteHistoryItem(id);
            loadHistory();
        }
    };

    const handleClearAll = async () => {
        if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
            await clearHistory();
            loadHistory();
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading history...</div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Generation History</h1>
                    <p className="text-muted-foreground mt-2">View and restore past generation sessions.</p>
                </div>
                {history.length > 0 && (
                    <button
                        onClick={handleClearAll}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:text-destructive/80 border border-destructive/20 hover:border-destructive/40 rounded-lg hover:bg-destructive/10 transition-colors"
                    >
                        <Trash2 size={16} />
                        Clear All History
                    </button>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.map((item) => (
                    <div key={item.id} className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-all">
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-lg truncate" title={item.presetName}>
                                        {item.presetName}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <Calendar size={12} />
                                        {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                                        {item.modelName}
                                    </span>
                                    <button
                                        onClick={(e) => handleDelete(e, item.id)}
                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                        title="Delete this history item"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Layers size={14} />
                                    {item.results.length} Images
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-1 mt-2 h-16">
                                {item.results.slice(0, 4).map((result, i) => (
                                    <div key={i} className="relative aspect-square bg-muted rounded-sm overflow-hidden">
                                        {result.imageUrl ? (
                                            <img src={result.imageUrl} alt="" className="object-cover w-full h-full" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                                                <Sparkles size={12} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-muted/30 border-t border-border flex justify-end">
                            <button
                                onClick={() => handleLoad(item)}
                                className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1"
                            >
                                Load Session <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                ))}

                {history.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        <p>No history found. Start generating images to see them here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
