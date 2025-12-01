import React, { useEffect, useState } from 'react';
import { HistoryItem } from '../lib/db';
import { getHistory, deleteHistoryItem, clearHistory } from '../app/actions';
import { Clock, Trash2, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface HistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onLoad: (item: HistoryItem) => void;
}

export function HistorySidebar({ isOpen, onClose, onLoad }: HistorySidebarProps) {
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadHistory();
        }
    }, [isOpen]);

    const loadHistory = async () => {
        const items = await getHistory();
        // Sort by timestamp descending (newest first)
        setHistory(items.sort((a: HistoryItem, b: HistoryItem) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this history item?')) {
            await deleteHistoryItem(id);
            loadHistory();
        }
    };

    const handleClearAll = async () => {
        if (confirm('Are you sure you want to clear the entire history? This action cannot be undone.')) {
            await clearHistory();
            loadHistory();
        }
    };

    return (
        <div
            className={`fixed inset-y-0 right-0 w-80 bg-background border-l border-border transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
        >
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Clock size={20} />
                    History
                </h2>
                <div className="flex items-center gap-2">
                    {history.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="text-xs text-destructive hover:text-destructive/80 font-medium px-2 py-1 rounded hover:bg-destructive/10 transition-colors"
                        >
                            Clear All
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="overflow-y-auto h-[calc(100vh-64px)] p-4 space-y-4">
                {history.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        No history yet.
                    </div>
                ) : (
                    history.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => onLoad(item)}
                            className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary transition-colors group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-muted-foreground">
                                    {new Date(item.timestamp).toLocaleString()}
                                </span>
                                <button
                                    onClick={(e) => handleDelete(e, item.id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors p-1 hover:bg-muted rounded"
                                    title="Delete item"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="font-medium text-sm mb-1">{item.presetName}</div>
                            <div className="text-xs text-muted-foreground mb-2">{item.modelName}</div>

                            <div className="flex gap-1 overflow-hidden h-12 rounded">
                                {item.results.slice(0, 4).map((result, idx) => (
                                    result.imageUrl ? (
                                        <img
                                            key={idx}
                                            src={result.imageUrl}
                                            alt="Thumbnail"
                                            className="w-12 h-12 object-cover"
                                        />
                                    ) : (
                                        <div key={idx} className="w-12 h-12 bg-muted flex items-center justify-center">
                                            <ImageIcon size={12} className="text-muted-foreground" />
                                        </div>
                                    )
                                ))}
                                {item.results.length > 4 && (
                                    <div className="w-12 h-12 bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">
                                        +{item.results.length - 4}
                                    </div>
                                )}
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                {item.results.length} items
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
