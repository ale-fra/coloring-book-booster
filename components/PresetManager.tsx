"use client";

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { type Preset } from '../lib/db';
import { getPresets, addPreset, deletePreset, updatePreset } from '../app/actions';
import { cn } from '../lib/utils';

interface PresetManagerProps {
    onSelect: (preset: Preset | null) => void;
    selectedPresetId?: string;
    isEnabled: boolean;
    onToggle: (enabled: boolean) => void;
    compact?: boolean;
}

export function PresetManager({ onSelect, selectedPresetId, isEnabled, onToggle, compact }: PresetManagerProps) {
    const [presets, setPresets] = useState<Preset[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);

    const [title, setTitle] = useState('');
    const [prompt, setPrompt] = useState('');

    useEffect(() => {
        loadPresets();
    }, []);

    useEffect(() => {
        if (selectedPresetId && isEnabled) {
            setIsExpanded(false);
        } else if (!selectedPresetId && isEnabled) {
            setIsExpanded(true);
        }
    }, [selectedPresetId, isEnabled]);

    async function loadPresets() {
        const items = await getPresets();
        setPresets(items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }

    async function handleSave() {
        if (!title.trim() || !prompt.trim()) return;

        if (editingId) {
            const preset = presets.find(p => p.id === editingId);
            if (preset) {
                const updated = { ...preset, title, prompt };
                await updatePreset(updated);
                if (selectedPresetId === editingId) {
                    onSelect(updated);
                }
            }
            setEditingId(null);
        } else {
            const newPreset = await addPreset({ title, prompt });
            onSelect(newPreset);
            setIsCreating(false);
        }

        setTitle('');
        setPrompt('');
        loadPresets();
    }

    async function handleDelete(id: string, e: React.MouseEvent) {
        e.stopPropagation();
        if (confirm('Delete this preset?')) {
            await deletePreset(id);
            if (selectedPresetId === id) onSelect(null);
            loadPresets();
        }
    }

    function startEdit(preset: Preset, e: React.MouseEvent) {
        e.stopPropagation();
        setEditingId(preset.id);
        setTitle(preset.title);
        setPrompt(preset.prompt);
        setIsCreating(false);
        setIsExpanded(true); // Ensure list is visible when editing
    }

    const selectedPreset = presets.find(p => p.id === selectedPresetId);

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1 border border-border">
                    <button
                        onClick={() => onToggle(!isEnabled)}
                        className={cn(
                            "px-2 py-1 text-xs font-medium rounded transition-colors",
                            isEnabled ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        {isEnabled ? 'Presets On' : 'Presets Off'}
                    </button>

                    {isEnabled && (
                        <div className="relative group">
                            <select
                                value={selectedPresetId || ''}
                                onChange={(e) => {
                                    const preset = presets.find(p => p.id === e.target.value);
                                    onSelect(preset || null);
                                }}
                                className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer pr-8 outline-none max-w-[150px] truncate"
                            >
                                <option value="">Select a Preset...</option>
                                {presets.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">System Presets</h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{isEnabled ? 'On' : 'Off'}</span>
                    <button
                        onClick={() => onToggle(!isEnabled)}
                        className={cn(
                            "w-11 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-primary",
                            isEnabled ? "bg-primary" : "bg-muted"
                        )}
                    >
                        <span
                            className={cn(
                                "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform",
                                isEnabled ? "translate-x-5" : "translate-x-0"
                            )}
                        />
                    </button>
                </div>
            </div>

            {isEnabled && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
                    {!isExpanded && selectedPreset ? (
                        <div className="bg-card border border-primary/50 rounded-lg p-4 flex items-center justify-between shadow-sm">
                            <div>
                                <h3 className="font-medium text-foreground">{selectedPreset.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-1">{selectedPreset.prompt}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsExpanded(true)}
                                    className="text-sm text-primary hover:underline"
                                >
                                    Change
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => { setIsCreating(true); setEditingId(null); setTitle(''); setPrompt(''); }}
                                    className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                                    title="Add New Preset"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            {(isCreating || editingId) && (
                                <div className="p-4 bg-secondary/50 rounded-lg border border-border space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <input
                                        placeholder="Preset Title"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full p-2 bg-background rounded border border-input focus:ring-2 focus:ring-ring outline-none"
                                    />
                                    <textarea
                                        placeholder="System Prompt"
                                        value={prompt}
                                        onChange={e => setPrompt(e.target.value)}
                                        className="w-full p-2 bg-background rounded border border-input min-h-[100px] focus:ring-2 focus:ring-ring outline-none resize-y"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => { setIsCreating(false); setEditingId(null); }}
                                            className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {presets.map(preset => (
                                    <div
                                        key={preset.id}
                                        onClick={() => onSelect(preset)}
                                        className={cn(
                                            "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50 relative group",
                                            selectedPresetId === preset.id
                                                ? "bg-primary/10 border-primary"
                                                : "bg-card border-border hover:bg-accent"
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-medium text-foreground">{preset.title}</h3>
                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{preset.prompt}</p>
                                            </div>
                                            {selectedPresetId === preset.id && (
                                                <div className="absolute top-3 right-3 text-primary">
                                                    <Check size={16} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 rounded p-1">
                                            <button onClick={(e) => startEdit(preset, e)} className="p-1 hover:text-blue-400 text-muted-foreground">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={(e) => handleDelete(preset.id, e)} className="p-1 hover:text-red-400 text-muted-foreground">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {presets.length === 0 && !isCreating && (
                                    <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                                        No presets found. Create one to get started.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
