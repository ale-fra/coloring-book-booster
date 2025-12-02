"use client";

import { useState } from "react";

interface SpaceImage {
    id: string;
    name?: string;
    mimeType?: string;
    dataUrl: string;
    analysis?: string;
}

export interface SpaceItem {
    id: string;
    name: string;
    objective: string;
    theme?: string;
    constraints?: string;
    styleDefinition?: string;
    prompt?: string;
    status?: string;
    images: SpaceImage[];
    createdAt?: string;
}

interface SpaceCardProps {
    space: SpaceItem;
}

export function SpaceCard({ space }: SpaceCardProps) {
    const [standardizedState, setStandardizedState] = useState<{
        prompt: string;
        request: string;
        isLoading: boolean;
        error?: string;
    }>({
        prompt: "",
        request: "",
        isLoading: false,
    });

    const handleStandardize = async () => {
        const request = standardizedState.request;
        if (!request) {
            setStandardizedState((prev) => ({
                ...prev,
                error: "Please enter a request to standardize.",
            }));
            return;
        }

        setStandardizedState((prev) => ({ ...prev, isLoading: true, error: undefined }));

        try {
            const response = await fetch(`/api/spaces/${space.id}/standardize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userRequest: request }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Unable to standardize request");
            }

            setStandardizedState((prev) => ({
                ...prev,
                prompt: data.prompt,
                isLoading: false,
            }));
        } catch (err: unknown) {
            setStandardizedState((prev) => ({
                ...prev,
                isLoading: false,
                error: err instanceof Error ? err.message : "Error standardizing prompt",
            }));
        }
    };

    return (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                    <p className="text-xs uppercase text-muted-foreground">Style</p>
                    <h3 className="text-xl font-semibold">{space.name}</h3>
                    <p className="text-sm text-muted-foreground">{space.objective}</p>
                </div>
                <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full self-start">
                    {space.status || "ready"}
                </span>
            </div>

            <details className="text-sm text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">Technical Details (Style Instructions)</summary>
                <div className="mt-2 bg-muted/40 border border-border rounded-md p-3 whitespace-pre-wrap">
                    {space.prompt || "No Style Instructions available."}
                </div>
            </details>

            {space.images.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium">Analyzed Examples</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {space.images.map((img) => (
                            <div key={img.id} className="border border-border rounded-md overflow-hidden">
                                <img
                                    src={img.dataUrl}
                                    alt={img.name || "Reference"}
                                    className="w-full h-24 object-cover"
                                />
                                <div className="p-2 text-xs text-muted-foreground space-y-1">
                                    <p className="font-medium text-foreground truncate">{img.name || "Reference"}</p>
                                    {img.analysis && <p className="line-clamp-3">{img.analysis}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <p className="text-sm font-medium">Create with this Style</p>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <input
                        type="text"
                        value={standardizedState.request}
                        onChange={(e) =>
                            setStandardizedState((prev) => ({ ...prev, request: e.target.value }))
                        }
                        placeholder="e.g. A unicorn jumping on a cloud"
                        className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm"
                    />
                    <button
                        onClick={handleStandardize}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
                        disabled={standardizedState.isLoading}
                    >
                        {standardizedState.isLoading ? "Processing..." : "Prepare Instructions"}
                    </button>
                </div>
                {standardizedState.error && (
                    <p className="text-sm text-destructive">{standardizedState.error}</p>
                )}
                {standardizedState.prompt && (
                    <div className="bg-muted/40 border border-border rounded-md p-3 text-sm whitespace-pre-wrap">
                        {standardizedState.prompt}
                    </div>
                )}
            </div>
        </div>
    );
}
