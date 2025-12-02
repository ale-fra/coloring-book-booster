import { useState } from 'react';
import { Download, Image as ImageIcon, AlertTriangle, Edit2, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react';

import { saveAs } from 'file-saver';
import { type GenerationResult } from '../lib/generation';

interface ResultGalleryProps {
    results: GenerationResult[];
    onRegenerate?: (index: number, newPrompt: string) => void;
    onVariantChange?: (index: number, variantIndex: number) => void;
    viewMode: 'small' | 'medium' | 'details';
}

export function ResultGallery({ results, onRegenerate, onVariantChange, viewMode }: ResultGalleryProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editPrompt, setEditPrompt] = useState("");

    if (results.length === 0) return null;

    if (results.length === 0) return null;

    function downloadSingle(result: GenerationResult, index: number) {
        const variantIndex = result.selectedVariantIndex || 0;
        const imageUrl = result.variants ? result.variants[variantIndex]?.imageUrl : result.imageUrl;

        if (!imageUrl) return;

        if (imageUrl.startsWith('data:image') || imageUrl.startsWith('http')) {
            saveAs(imageUrl, `image-${index + 1}-v${variantIndex + 1}.png`);
        } else {
            // Fallback for text content
            const blob = new Blob([imageUrl], { type: "text/plain;charset=utf-8" });
            saveAs(blob, `result-${index + 1}-v${variantIndex + 1}.txt`);
        }
    }

    const startEditing = (index: number, prompt: string) => {
        setEditingIndex(index);
        setEditPrompt(prompt);
    };

    const cancelEditing = () => {
        setEditingIndex(null);
        setEditPrompt("");
    };

    const handleRegenerateClick = (index: number) => {
        if (onRegenerate) {
            onRegenerate(index, editPrompt);
            cancelEditing();
        }
    };

    const handlePrevVariant = (index: number, result: GenerationResult) => {
        if (!onVariantChange || !result.variants) return;
        const current = result.selectedVariantIndex || 0;
        const prev = current > 0 ? current - 1 : result.variants.length - 1;
        onVariantChange(index, prev);
    };

    const handleNextVariant = (index: number, result: GenerationResult) => {
        if (!onVariantChange || !result.variants) return;
        const current = result.selectedVariantIndex || 0;
        const next = current < result.variants.length - 1 ? current + 1 : 0;
        onVariantChange(index, next);
    };

    return (
        <div className="space-y-4">
            <div className={`grid gap-4 ${viewMode === 'small' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5' :
                viewMode === 'medium' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' :
                    'grid-cols-1'
                }`}>
                {results.map((result, index) => {
                    const variantIndex = result.selectedVariantIndex || 0;
                    const currentImageUrl = result.variants ? result.variants[variantIndex]?.imageUrl : result.imageUrl;
                    const currentPrompt = result.variants ? result.variants[variantIndex]?.prompt : result.prompt;
                    const variantCount = result.variants?.length || 0;

                    // Small view - image only
                    if (viewMode === 'small') {
                        return (
                            <div key={index} className="bg-card border border-border rounded-lg overflow-hidden relative group">
                                <div className="aspect-square bg-secondary/50 relative flex items-center justify-center">
                                    {result.isLoading ? (
                                        <RefreshCw className="animate-spin text-muted-foreground" size={24} />
                                    ) : result.error ? (
                                        <AlertTriangle className="text-destructive" size={24} />
                                    ) : currentImageUrl ? (
                                        currentImageUrl.startsWith('data:image') || currentImageUrl.startsWith('http') ? (
                                            <img src={currentImageUrl} alt={currentPrompt} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-xs text-muted-foreground overflow-hidden p-2">
                                                {currentImageUrl.substring(0, 50)}...
                                            </div>
                                        )
                                    ) : (
                                        <ImageIcon className="text-muted-foreground" size={24} />
                                    )}

                                    {/* Regeneration indicator for small view */}
                                    {!result.isLoading && variantCount > 1 && (
                                        <div className="absolute top-1 left-1 p-1 bg-black/60 text-white rounded backdrop-blur-sm" title="Regenerated">
                                            <RefreshCw size={12} />
                                        </div>
                                    )}

                                    {/* Variant indicator for small view */}
                                    {!result.isLoading && variantCount > 1 && (
                                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded backdrop-blur-sm">
                                            {variantIndex + 1}/{variantCount}
                                        </div>
                                    )}

                                    {/* Download on hover */}
                                    {!result.isLoading && !result.error && currentImageUrl && (
                                        <button
                                            onClick={() => downloadSingle(result, index)}
                                            className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 text-white rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Download"
                                        >
                                            <Download size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    // Medium view - image with prompt below
                    if (viewMode === 'medium') {
                        return (
                            <div key={index} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col relative group">
                                <div className="aspect-square bg-secondary/50 relative flex items-center justify-center">
                                    {result.isLoading ? (
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground animate-pulse">
                                            <RefreshCw className="animate-spin" size={28} />
                                        </div>
                                    ) : result.error ? (
                                        <div className="text-destructive text-center p-4">
                                            <AlertTriangle className="mx-auto mb-2" size={28} />
                                            <p className="text-xs">{result.error}</p>
                                        </div>
                                    ) : currentImageUrl ? (
                                        currentImageUrl.startsWith('data:image') || currentImageUrl.startsWith('http') ? (
                                            <img src={currentImageUrl} alt={currentPrompt} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-xs text-muted-foreground overflow-auto h-full w-full p-2 bg-black/20 rounded whitespace-pre-wrap">
                                                {currentImageUrl}
                                            </div>
                                        )
                                    ) : (
                                        <ImageIcon className="text-muted-foreground" size={28} />
                                    )}

                                    {/* Variant Navigation */}
                                    {!result.isLoading && variantCount > 1 && (
                                        <>
                                            <button
                                                onClick={() => handlePrevVariant(index, result)}
                                                className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleNextVariant(index, result)}
                                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/50 text-white text-[10px] rounded-full backdrop-blur-sm">
                                                {variantIndex + 1}/{variantCount}
                                            </div>
                                        </>
                                    )}

                                    {/* Edit and Download buttons */}
                                    {!result.isLoading && !result.error && currentImageUrl && (
                                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {onRegenerate && (
                                                <button
                                                    onClick={() => startEditing(index, currentPrompt || "")}
                                                    className="p-1 bg-black/50 hover:bg-black/70 text-white rounded backdrop-blur-sm"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => downloadSingle(result, index)}
                                                className="p-1 bg-black/50 hover:bg-black/70 text-white rounded backdrop-blur-sm"
                                                title="Download"
                                            >
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Prompt text below - fully visible */}
                                <div className="p-2">
                                    {editingIndex === index ? (
                                        <div className="space-y-1">
                                            <textarea
                                                value={editPrompt}
                                                onChange={(e) => setEditPrompt(e.target.value)}
                                                className="w-full text-xs bg-secondary/50 border border-border rounded p-1.5 min-h-[40px] resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                                                autoFocus
                                            />
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleRegenerateClick(index)}
                                                    className="flex-1 flex items-center justify-center gap-1 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90"
                                                >
                                                    <RefreshCw size={10} /> Regenerate
                                                </button>
                                                <button
                                                    onClick={cancelEditing}
                                                    className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded hover:bg-secondary/80"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground whitespace-pre-wrap" title={currentPrompt}>
                                            {currentPrompt}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    // List/Details view - complete redesign with variant gallery
                    return (
                        <div key={index} className="bg-card border border-border rounded-lg overflow-hidden p-4 space-y-3">
                            {/* Header with Prompt Number */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-foreground">Image {index + 1}</h3>
                                {variantCount > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        {variantCount} variant{variantCount !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            {/* Editable Prompt - Always Visible */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Prompt</label>
                                <textarea
                                    value={editingIndex === index ? editPrompt : currentPrompt}
                                    onChange={(e) => {
                                        if (editingIndex !== index) {
                                            startEditing(index, currentPrompt || "");
                                        }
                                        setEditPrompt(e.target.value);
                                    }}
                                    onFocus={() => {
                                        if (editingIndex !== index) {
                                            startEditing(index, currentPrompt || "");
                                        }
                                    }}
                                    className="w-full text-sm bg-secondary/30 border border-border rounded-md p-2 min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    placeholder="Enter your prompt..."
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const promptToUse = editingIndex === index ? editPrompt : currentPrompt || "";
                                        if (onRegenerate) {
                                            onRegenerate(index, promptToUse);
                                            cancelEditing();
                                        }
                                    }}
                                    disabled={result.isLoading}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className={result.isLoading ? "animate-spin" : ""} size={16} />
                                    {result.isLoading ? 'Regenerating...' : 'Regenerate'}
                                </button>
                                <button
                                    onClick={() => downloadSingle(result, index)}
                                    disabled={!!result.error || !currentImageUrl || result.isLoading}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm rounded-md transition-colors disabled:opacity-50"
                                >
                                    <Download size={16} />
                                    Download Current
                                </button>
                            </div>

                            {/* Variant Gallery - Horizontal Scroll */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    {result.isLoading && variantCount === 0 ? 'Generating...' : 'Variants'}
                                </label>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {/* Show existing variants */}
                                    {result.variants?.map((variant, vIndex) => (
                                        <button
                                            key={vIndex}
                                            onClick={() => onVariantChange && onVariantChange(index, vIndex)}
                                            className={`flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden border-2 transition-all ${vIndex === variantIndex
                                                ? 'border-primary shadow-md scale-105'
                                                : 'border-border hover:border-primary/50'
                                                }`}
                                        >
                                            {variant.imageUrl && (variant.imageUrl.startsWith('data:image') || variant.imageUrl.startsWith('http')) ? (
                                                <img
                                                    src={variant.imageUrl}
                                                    alt={`Variant ${vIndex + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                                                    <ImageIcon className="text-muted-foreground" size={24} />
                                                </div>
                                            )}
                                            {vIndex === variantIndex && (
                                                <div className="relative -mt-6 mb-2 text-center">
                                                    <span className="inline-block px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-medium rounded-full">
                                                        Current
                                                    </span>
                                                </div>
                                            )}
                                        </button>
                                    ))}

                                    {/* Show loading placeholder when generating */}
                                    {result.isLoading && (
                                        <div className="flex-shrink-0 w-32 h-32 rounded-lg border-2 border-dashed border-primary bg-secondary/30 flex flex-col items-center justify-center gap-2">
                                            <RefreshCw className="animate-spin text-primary" size={24} />
                                            <span className="text-[10px] text-muted-foreground">Generating...</span>
                                        </div>
                                    )}

                                    {/* Show error state if no variants and error exists */}
                                    {!result.isLoading && variantCount === 0 && result.error && (
                                        <div className="flex-shrink-0 w-32 h-32 rounded-lg border-2 border-destructive bg-destructive/10 flex flex-col items-center justify-center gap-2 p-2">
                                            <AlertTriangle className="text-destructive" size={24} />
                                            <span className="text-[10px] text-destructive text-center">{result.error}</span>
                                        </div>
                                    )}

                                    {/* Fallback for single image (no variants array) */}
                                    {!result.variants && result.imageUrl && !result.isLoading && (
                                        <div className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden border-2 border-primary shadow-md">
                                            {(result.imageUrl.startsWith('data:image') || result.imageUrl.startsWith('http')) ? (
                                                <img
                                                    src={result.imageUrl}
                                                    alt="Generated image"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                                                    <ImageIcon className="text-muted-foreground" size={24} />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Empty state */}
                                    {!result.isLoading && variantCount === 0 && !result.imageUrl && !result.error && (
                                        <div className="flex-shrink-0 w-32 h-32 rounded-lg border-2 border-dashed border-border bg-secondary/20 flex items-center justify-center">
                                            <span className="text-xs text-muted-foreground">No variants yet</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div >
    );
}
