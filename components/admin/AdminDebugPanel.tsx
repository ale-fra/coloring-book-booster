"use client";

import { useState, useEffect } from "react";
import { Activity, X, ChevronRight, ChevronDown, RefreshCw, Database } from "lucide-react";
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

export function AdminDebugPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<string | null>(null);

    // Only fetch when open
    const { data, error, mutate } = useSWR(
        isOpen ? "/api/admin/ai-logs" : null,
        fetcher,
        { refreshInterval: 3000 }
    );

    const logs: AILog[] = data?.logs || [];

    if (!isOpen) {
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

    return (
        <div className="fixed inset-y-0 right-0 z-50 w-[500px] bg-background border-l border-border shadow-2xl flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
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
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-muted rounded-md text-muted-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
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
                                            {new Date(log.timestamp).toLocaleTimeString()}
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
                                    <div>
                                        <p className="text-xs font-semibold mb-1 text-muted-foreground">Input</p>
                                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40 whitespace-pre-wrap">
                                            {tryFormatJson(log.input)}
                                        </pre>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold mb-1 text-muted-foreground">Output</p>
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
