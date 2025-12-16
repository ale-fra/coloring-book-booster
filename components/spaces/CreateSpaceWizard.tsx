"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, X, Pencil, Code, Sparkles } from "lucide-react";
import { mutate } from "swr";
import { ImageUploader } from "../ImageUploader";
import { GuidedCreationChat } from "./GuidedCreationChat";

interface CreateSpaceWizardProps {
    onCancel: () => void;
    onSuccess: () => void;
}

export function CreateSpaceWizard({ onCancel, onSuccess }: CreateSpaceWizardProps) {
    const [step, setStep] = useState(0);
    const [form, setForm] = useState({
        name: "",
        objective: "",
        constraints: "",
        styleDefinition: "",
    });
    const [analysisContext, setAnalysisContext] = useState<{ mood?: string; subject?: string; goal?: string }>({});
    const [references, setReferences] = useState<{ dataUrl: string; mimeType: string; name: string }[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [targetModel, setTargetModel] = useState<'gemini' | 'flux'>('gemini');
    const [generatedPrompt, setGeneratedPrompt] = useState("");
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
    const [debugMode, setDebugMode] = useState(false);

    const handleAnalyze = async () => {
        if (!form.name || references.length === 0) {
            setError("Please provide a name and at least one image.");
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setStep(2);

        try {
            const response = await fetch("/api/spaces/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: form.name, references, context: analysisContext }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Analysis failed");
            }

            setForm((prev) => ({
                ...prev,
                objective: data.objective,
                constraints: data.constraints,
                styleDefinition: data.styleDefinition,
            }));
            setStep(3);
        } catch (err) {
            setError("Failed to analyze images. Please try again.");
            setStep(1);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGeneratePrompt = async () => {
        setIsGeneratingPrompt(true);
        setError(null);

        try {
            const response = await fetch("/api/spaces/generate-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    objective: form.objective,
                    constraints: form.constraints,
                    styleDefinition: form.styleDefinition,
                    targetModel
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to generate prompt");
            }

            setGeneratedPrompt(data.prompt);
        } catch (err) {
            setError("Failed to generate prompt. Please try again.");
        } finally {
            setIsGeneratingPrompt(false);
        }
    };

    const handleCreate = async () => {
        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch("/api/spaces", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, prompt: generatedPrompt, references }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to create space");
            }

            mutate("/api/spaces");
            onSuccess();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Error creating Space.";
            setError(message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-card border border-border rounded-xl p-10 w-full mx-auto space-y-8 min-h-[80vh]">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-semibold">Create Your Space Style</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setDebugMode(!debugMode)}
                        className={`p-2 rounded-md transition-colors ${debugMode ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        title="Toggle Debug Mode"
                    >
                        <Code size={20} />
                    </button>
                    <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
                        <X className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto">
                <span className={step >= 0 ? "text-primary font-medium whitespace-nowrap" : "whitespace-nowrap"}>1. Vibe Check</span>
                <ArrowRight className="h-4 w-4" />
                <span className={step >= 1 ? "text-primary font-medium whitespace-nowrap" : "whitespace-nowrap"}>2. Setup</span>
                <ArrowRight className="h-4 w-4" />
                <span className={step >= 2 ? "text-primary font-medium whitespace-nowrap" : "whitespace-nowrap"}>3. Analysis</span>
                <ArrowRight className="h-4 w-4" />
                <span className={step >= 3 ? "text-primary font-medium whitespace-nowrap" : "whitespace-nowrap"}>4. Review</span>
                <ArrowRight className="h-4 w-4" />
                <span className={step >= 4 ? "text-primary font-medium whitespace-nowrap" : "whitespace-nowrap"}>5. Prompt</span>
            </div>

            {step === 0 && (
                <div className="space-y-6">
                    <div className="text-center space-y-2">
                        <h3 className="text-lg font-medium">Let's start with a Vibe Check</h3>
                        <p className="text-sm text-muted-foreground">Tell our AI Director what you want to create (e.g. "Spooky coloring pages", "Clean icons").</p>
                    </div>
                    <GuidedCreationChat
                        onComplete={(ctx) => {
                            setAnalysisContext(ctx);
                            // Auto-fill name if subject provided and name empty? 
                            if (ctx.subject && !form.name) {
                                setForm(prev => ({ ...prev, name: ctx.subject + " Style" }));
                            }
                            setStep(1);
                        }}
                    />
                    <div className="flex justify-between">
                        <div className="text-xs text-muted-foreground">
                            * The AI will ask a few questions to understand your goal.
                        </div>
                        <button
                            onClick={() => setStep(1)}
                            className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1"
                        >
                            Skip to upload <ArrowRight className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            )}

            {step === 1 && (
                <div className="space-y-6">
                    {/* Mirroring Handshake / Summary */}
                    {(analysisContext.mood || analysisContext.subject) && (
                        <div className="bg-secondary/20 border border-border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium flex items-center gap-2">
                                    <Sparkles size={14} className="text-primary" />
                                    Vibe Check Summary
                                </h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Mood</label>
                                    <input
                                        value={analysisContext.mood || ''}
                                        readOnly
                                        className="w-full bg-background/50 border border-border rounded px-2 py-1 text-sm text-muted-foreground cursor-default focus:ring-0"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Subject</label>
                                    <input
                                        value={analysisContext.subject || ''}
                                        readOnly
                                        className="w-full bg-background/50 border border-border rounded px-2 py-1 text-sm text-muted-foreground cursor-default focus:ring-0"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Goal</label>
                                    <input
                                        value={analysisContext.goal || ''}
                                        readOnly
                                        className="w-full bg-background/50 border border-border rounded px-2 py-1 text-sm text-muted-foreground cursor-default focus:ring-0"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Debug View */}
                    {debugMode && (
                        <div className="bg-slate-950 text-slate-50 p-4 rounded-lg font-mono text-xs overflow-auto max-h-40">
                            <h5 className="mb-2 text-slate-400 font-bold">DEBUG: Analysis Payload</h5>
                            <pre>{JSON.stringify({
                                name: form.name,
                                context: analysisContext,
                                referencesCount: references.length
                            }, null, 2)}</pre>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Style Name</label>
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Vintage Comic Book"
                            className="w-full bg-background border border-border rounded-md px-3 py-2"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Reference Images (Max 10)</label>
                        <ImageUploader
                            onImagesChange={setReferences}
                            initialImages={references}
                            maxImages={10}
                            maxWidth={1024}
                        />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <div className="flex justify-between">
                        <button
                            onClick={() => setStep(0)}
                            className="text-muted-foreground hover:text-foreground flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" /> Vibe Check
                        </button>
                        <button
                            onClick={handleAnalyze}
                            disabled={!form.name || references.length === 0}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                        >
                            Analyze Style <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <div>
                        <h3 className="text-lg font-medium">Analyzing your style...</h3>
                        <p className="text-sm text-muted-foreground">This usually takes 10-15 seconds.</p>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Style Description</label>
                            <textarea
                                value={form.objective}
                                onChange={(e) => setForm({ ...form, objective: e.target.value })}
                                className="w-full bg-background border border-border rounded-md px-3 py-2 min-h-[100px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Constraints (What to avoid)</label>
                            <textarea
                                value={form.constraints}
                                onChange={(e) => setForm({ ...form, constraints: e.target.value })}
                                className="w-full bg-background border border-border rounded-md px-3 py-2 min-h-[80px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Style Definition</label>
                            <textarea
                                value={form.styleDefinition}
                                onChange={(e) => setForm({ ...form, styleDefinition: e.target.value })}
                                className="w-full bg-background border border-border rounded-md px-3 py-2 min-h-[60px]"
                            />
                        </div>
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <div className="flex justify-between">
                        <button
                            onClick={() => setStep(1)}
                            className="text-muted-foreground hover:text-foreground flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back
                        </button>
                        <button
                            onClick={() => setStep(4)}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2"
                        >
                            Next: Generate Prompt <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Generate Space Prompt</h3>
                        <p className="text-sm text-muted-foreground">Select the target model to generate an optimized system prompt.</p>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setTargetModel('gemini')}
                                className={`p-4 border rounded-lg text-left transition-colors ${targetModel === 'gemini' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                            >
                                <div className="font-medium mb-1">Gemini / Imagen</div>
                                <div className="text-xs text-muted-foreground">Natural language descriptions. Best for Google models.</div>
                            </button>

                            <button
                                onClick={() => setTargetModel('flux')}
                                className={`p-4 border rounded-lg text-left transition-colors ${targetModel === 'flux' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                            >
                                <div className="font-medium mb-1">Flux (BFL)</div>
                                <div className="text-xs text-muted-foreground">Tag-based, technical keywords. Best for Flux models.</div>
                            </button>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handleGeneratePrompt}
                                disabled={isGeneratingPrompt}
                                className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                            >
                                {isGeneratingPrompt ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                                    </>
                                ) : (
                                    <>
                                        Generate Prompt
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">System Prompt</label>
                            <textarea
                                value={generatedPrompt}
                                onChange={(e) => setGeneratedPrompt(e.target.value)}
                                placeholder="Generated prompt will appear here..."
                                className="w-full bg-background border border-border rounded-md px-3 py-2 min-h-[150px] font-mono text-sm"
                            />
                        </div>
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <div className="flex justify-between">
                        <button
                            onClick={() => setStep(3)}
                            className="text-muted-foreground hover:text-foreground flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={isSaving || !generatedPrompt}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4" /> Create Space
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
