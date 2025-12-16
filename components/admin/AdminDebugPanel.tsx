"use client";

import { useState, useEffect } from "react";
import { Activity, X, ChevronRight, ChevronDown, RefreshCw, Database, Maximize2, Trash2, Copy, Check } from "lucide-react";
import { clearAILogs } from "@/app/actions";
import useSWR from "swr";

interface AILog {
    id: string;
    timestamp: string;
    provider: string;
    model: string;
    input: string;
    output: string;
    status: 'success' | 'error';
    durationMs: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function AdminDebugPanel({ isPopup = false }: { isPopup?: boolean }) {
    const [isOpen, setIsOpen] = useState(isPopup);
    const [selectedLog, setSelectedLog] = useState<string | null>(null);

    // Only fetch when open
    const { data, error, mutate } = useSWR(
        isOpen ? "/api/admin/ai-logs" : null,
        fetcher,
        { refreshInterval: 3000 }
    );

    const logs: AILog[] = data?.logs || [];

    // Helper for date formatting
    const formatLogDate = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();

        if (isToday) {
            return date.toLocaleTimeString();
        }
        return date.toLocaleString();
    };

    const openPopup = () => {
        window.open('/debug/popup', 'DebugPanel', 'width=600,height=800,scrollbars=yes,resizable=yes');
        setIsOpen(false);
    };

    const handleClearLogs = async () => {
        if (confirm('Are you sure you want to clear all AI logs?')) {
            await clearAILogs();
            mutate();
        }
    };

    const [copiedId, setCopiedId] = useState<string | null>(null);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (!isOpen && !isPopup) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-50 bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-all"
                title="Open AI Debug Panel"
            >
                <Activity className="h-6 w-6" />
            </button>
        );
    }

    const containerClasses = isPopup
        ? "h-screen w-full bg-background flex flex-col"
        : "fixed inset-y-0 right-0 z-50 w-[500px] bg-background border-l border-border shadow-2xl flex flex-col";

    return (
        <div className={containerClasses}>
            <div className={`p-4 border-b border-border flex items-center justify-between bg-muted/30`}>
                <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">AI Interaction Logs</h2>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {logs.length} events
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => mutate()}
                        className="p-1 hover:bg-muted rounded-md text-muted-foreground"
                        title="Refresh"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                        onClick={handleClearLogs}
                        className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-destructive"
                        title="Clear All Logs"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                    {!isPopup && (
                        <>
                            <button
                                onClick={openPopup}
                                className="p-1 hover:bg-muted rounded-md text-muted-foreground"
                                title="Open in Popup"
                            >
                                <Maximize2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-muted rounded-md text-muted-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {error ? (
                    <div className="text-destructive text-sm p-4 text-center">
                        Failed to load logs. You might not be an admin.
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-muted-foreground text-sm p-4 text-center">
                        No logs found yet.
                    </div>
                ) : (
                    logs.map((log) => (
                        <div
                            key={log.id}
                            className={`border rounded-lg text-sm overflow-hidden transition-all ${selectedLog === log.id ? 'border-primary ring-1 ring-primary/20' : 'border-border hover:border-primary/50'
                                }`}
                        >
                            <div
                                className="p-3 cursor-pointer bg-card flex items-start justify-between gap-2"
                                onClick={() => setSelectedLog(selectedLog === log.id ? null : log.id)}
                            >
                                <div className="space-y-1 flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className="font-medium uppercase text-xs tracking-wider text-muted-foreground">{log.provider}</span>
                                        <span className="text-xs text-muted-foreground ml-auto font-mono">
                                            {formatLogDate(log.timestamp)}
                                        </span>
                                    </div>
                                    <p className="font-medium truncate">{log.model}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{log.durationMs}ms</span>
                                    </div>
                                </div>
                                {selectedLog === log.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            </div>

                            {selectedLog === log.id && (
                                <div className="p-3 border-t border-border bg-muted/10 space-y-3">
                                    <div className="relative group">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-semibold text-muted-foreground">Input</p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyToClipboard(tryFormatJson(log.input), `input-${log.id}`);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background rounded text-muted-foreground"
                                                title="Copy Input"
                                            >
                                                {copiedId === `input-${log.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                            </button>
                                        </div>
                                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40 whitespace-pre-wrap">
                                            {tryFormatJson(log.input)}
                                        </pre>
                                    </div>
                                    <div className="relative group">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-semibold text-muted-foreground">Output</p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyToClipboard(tryFormatJson(log.output), `output-${log.id}`);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background rounded text-muted-foreground"
                                                title="Copy Output"
                                            >
                                                {copiedId === `output-${log.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                            </button>
                                        </div>
                                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-60 whitespace-pre-wrap">
                                            {tryFormatJson(log.output)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function tryFormatJson(str: string) {
    try {
        return JSON.stringify(JSON.parse(str), null, 2);
    } catch (e) {
        return str;
    }
}
