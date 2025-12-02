"use client";

import { useState } from "react";
import { Plus, UploadCloud } from "lucide-react";
import { ImageUploader } from "../ImageUploader";
import { mutate } from "swr";

interface CreateSpaceFormProps {
    onSuccess?: () => void;
}

export function CreateSpaceForm({ onSuccess }: CreateSpaceFormProps) {
    const [form, setForm] = useState({
        name: "",
        objective: "",
        theme: "",
        constraints: "",
        styleDefinition: "",
    });
    const [references, setReferences] = useState<{ dataUrl: string; mimeType: string; name: string }[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleCreateSpace = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch("/api/spaces", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, references }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Unable to create Space");
            }

            // Trigger revalidation of the spaces list
            mutate("/api/spaces");

            setForm({ name: "", objective: "", theme: "", constraints: "", styleDefinition: "" });
            setReferences([]);
            setSuccessMessage("Space created and Style Instructions generated successfully.");
            if (onSuccess) onSuccess();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Error creating Space.";
            setError(message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Create a new Style</h2>
            </div>
            <p className="text-sm text-muted-foreground">
                Describe the style, attach examples, and let the automatic analysis generate reliable Style Instructions.
            </p>
            <form className="space-y-4" onSubmit={handleCreateSpace}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="space-y-1">
                        <span className="text-sm font-medium">Style Name</span>
                        <input
                            required
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. Botanical Line Art"
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="text-sm font-medium">Recurring Theme (optional)</span>
                        <input
                            value={form.theme}
                            onChange={(e) => setForm((prev) => ({ ...prev, theme: e.target.value }))}
                            placeholder="e.g. minimal floral patterns"
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                        />
                    </label>
                </div>

                <label className="space-y-1 block">
                    <span className="text-sm font-medium">Describe the style you want</span>
                    <textarea
                        required
                        value={form.objective}
                        onChange={(e) => setForm((prev) => ({ ...prev, objective: e.target.value }))}
                        placeholder="e.g. thick lines, clear backgrounds, centered subjects, no shading..."
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm min-h-[80px]"
                    />
                </label>

                <label className="space-y-1 block">
                    <span className="text-sm font-medium">Constraints and things to avoid (optional)</span>
                    <textarea
                        value={form.constraints}
                        onChange={(e) => setForm((prev) => ({ ...prev, constraints: e.target.value }))}
                        placeholder="e.g. avoid realistic faces, no crowded backgrounds, prefer symmetrical compositions"
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm min-h-[60px]"
                    />
                </label>

                <label className="space-y-1 block">
                    <span className="text-sm font-medium">Style Definition (optional)</span>
                    <textarea
                        value={form.styleDefinition}
                        onChange={(e) => setForm((prev) => ({ ...prev, styleDefinition: e.target.value }))}
                        placeholder="Briefly describe the mood or other notes to incorporate into the Style Instructions."
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm min-h-[60px]"
                    />
                </label>

                <ImageUploader
                    onImagesChange={setReferences}
                    maxImages={10}
                    maxWidth={1024}
                />

                {error && <p className="text-sm text-destructive">{error}</p>}
                {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

                <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center justify-center gap-2 font-medium hover:opacity-90 disabled:opacity-60"
                >
                    {isSaving ? "Analyzing..." : "Create Style and Generate Instructions"}
                </button>
            </form>
        </div>
    );
}
