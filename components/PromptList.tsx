"use client";

import { useState } from 'react';
import { Trash2, Edit2, Check, X, Sparkles, RefreshCw, Wand2, Grid3x3, LayoutGrid, List, Download } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { GenerationResult } from '../lib/generation';
import { ResultGallery } from './ResultGallery';

interface PromptListProps {
    prompts: string[];
    results: GenerationResult[];
    isGenerating: boolean;
    onUpdatePrompt: (index: number, newPrompt: string) => void;
    onDeletePrompt: (index: number) => void;
    onGenerate: () => void;
    onEnhancePrompts: () => void;
    onRegenerate: (index: number, prompt: string) => void;
    onVariantChange: (index: number, variantIndex: number) => void;
}

type ViewMode = 'small' | 'medium' | 'details';

export function PromptList({
    prompts,
    results,
    isGenerating,
    onUpdatePrompt,
    onDeletePrompt,
    onGenerate,
    onEnhancePrompts,
    onRegenerate,
    onVariantChange
}: PromptListProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('small');

    const startEditing = (index: number, prompt: string) => {
        setEditingIndex(index);
        setEditValue(prompt);
    };

    const saveEdit = (index: number) => {
        onUpdatePrompt(index, editValue);
        setEditingIndex(null);
    };

    const downloadAll = async () => {
        const zip = new JSZip();
        const folder = zip.folder("generated-images");

        // Helper to fetch or process image data
        const processImage = async (urlOrData: string, index: number, variantIndex: number = 0) => {
            try {
                if (urlOrData.startsWith('http')) {
                    const resp = await fetch(urlOrData);
                    const blob = await resp.blob();
                    folder?.file(`image-${index + 1}-v${variantIndex + 1}.png`, blob);
                } else if (urlOrData.startsWith('data:image')) {
                    const data = urlOrData.split(',')[1];
                    folder?.file(`image-${index + 1}-v${variantIndex + 1}.png`, data, { base64: true });
                } else {
                    // Fallback: save as text if it's not clearly an image
                    folder?.file(`result-${index + 1}-v${variantIndex + 1}.txt`, urlOrData);
                }
            } catch (e) {
                console.error("Failed to add file to zip", e);
                folder?.file(`error-${index + 1}.txt`, "Failed to download image");
            }
        };

        await Promise.all(results.map((r, i) => {
            // Download currently selected variant
            const variantIndex = r.selectedVariantIndex || 0;
            const imageUrl = r.variants ? r.variants[variantIndex]?.imageUrl : r.imageUrl;
            return imageUrl ? processImage(imageUrl, i, variantIndex) : null;
        }));

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "gemini-images.zip");
    };

    const hasResults = results.length > 0;

    return (
        <div className={`w-full mx-auto space-y-8 pb-32 ${hasResults ? 'max-w-[95%]' : 'max-w-5xl'}`}>
            {/* Header / Actions */}
            <div className="flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-md z-10 py-4 border-b border-border">
                <div>
                    <h2 className="text-lg font-semibold">
                        {hasResults ? 'Generation Results' : 'Review Prompts'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {prompts.length} items • {hasResults ? 'Completed' : 'Ready to generate'}
                    </p>
                </div>
                {hasResults ? (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={downloadAll}
                            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:opacity-90 transition-all flex items-center gap-2"
                        >
                            <Download size={16} />
                            Download All
                        </button>

                        {/* View Mode Toggle for Results */}
                        <div className="flex items-center gap-1 bg-secondary/50 rounded-md p-1">
                            <button
                                onClick={() => setViewMode('small')}
                                className={`p-2 rounded transition-colors ${viewMode === 'small' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                                title="Small - Image only"
                            >
                                <Grid3x3 size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('medium')}
                                className={`p-2 rounded transition-colors ${viewMode === 'medium' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                                title="Medium - Image with prompt"
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('details')}
                                className={`p-2 rounded transition-colors ${viewMode === 'details' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                                title="Details - Full view"
                            >
                                <List size={16} />
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Generation Buttons */
                    <div className="flex gap-2">
                        <button
                            onClick={onEnhancePrompts}
                            disabled={isGenerating || prompts.length === 0}
                            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-medium hover:bg-secondary/80 transition-all disabled:opacity-50 flex items-center gap-2 border border-border"
                        >
                            <Wand2 size={16} />
                            Enhance with AI
                        </button>
                        <button
                            onClick={onGenerate}
                            disabled={isGenerating || prompts.length === 0}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <RefreshCw className="animate-spin" size={16} />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    Generate All
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Results Gallery - Show all results together when available */}
            {hasResults ? (
                <ResultGallery
                    results={results}
                    onRegenerate={onRegenerate}
                    onVariantChange={onVariantChange}
                    viewMode={viewMode}
                />
            ) : (
                /* Prompts List - Only show when no results */
                <div className="space-y-4">
                    {prompts.map((prompt, index) => {
                        const isEditing = editingIndex === index;

                        return (
                            <div key={index} className="group bg-card border border-border rounded-lg p-4 transition-all hover:shadow-sm">
                                {/* Prompt Text / Edit Mode */}
                                <div>
                                    {isEditing ? (
                                        <div className="flex gap-2">
                                            <textarea
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                className="flex-1 bg-secondary/50 border border-border rounded p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                                                rows={2}
                                                autoFocus
                                            />
                                            <div className="flex flex-col gap-1">
                                                <button onClick={() => saveEdit(index)} className="p-1.5 bg-primary text-primary-foreground rounded hover:opacity-90">
                                                    <Check size={14} />
                                                </button>
                                                <button onClick={() => setEditingIndex(null)} className="p-1.5 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-start gap-4">
                                            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{prompt}</p>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEditing(index, prompt)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => onDeletePrompt(index)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
