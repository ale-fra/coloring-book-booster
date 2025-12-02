"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";
import { mutate } from "swr";
import { ImageUploader } from "../ImageUploader";

interface CreateSpaceWizardProps {
    onCancel: () => void;
    onSuccess: () => void;
}

export function CreateSpaceWizard({ onCancel, onSuccess }: CreateSpaceWizardProps) {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        name: "",
        objective: "",
        constraints: "",
        styleDefinition: "",
    });
    const [references, setReferences] = useState<{ dataUrl: string; mimeType: string; name: string }[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                body: JSON.stringify({ name: form.name, references }),
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

    const handleCreate = async () => {
        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch("/api/spaces", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, references }),
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
                <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
                    <X className="h-6 w-6" />
                </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={step >= 1 ? "text-primary font-medium" : ""}>1. Setup</span>
                <ArrowRight className="h-4 w-4" />
                <span className={step >= 2 ? "text-primary font-medium" : ""}>2. Analysis</span>
                <ArrowRight className="h-4 w-4" />
                <span className={step >= 3 ? "text-primary font-medium" : ""}>3. Review</span>
            </div>

            {step === 1 && (
                <div className="space-y-6">
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
                            maxImages={10}
                            maxWidth={1024}
                        />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <div className="flex justify-end">
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
                            onClick={handleCreate}
                            disabled={isSaving}
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
