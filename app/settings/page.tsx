"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save, Edit2, X, Sun, Moon, Monitor, Check, ShieldAlert } from 'lucide-react';
import {
    getModels,
    addModel,
    updateModel,
    deleteModel,
    setDefaultModel,

    initializeDefaultModels
} from '../../app/actions';
import { type ModelConfig } from '../../lib/db';
import { useTheme } from 'next-themes';
import { cn } from '../../lib/utils';

interface SettingsSectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    action?: React.ReactNode;
}

const SettingsSection = ({ title, description, children, action }: SettingsSectionProps) => (
    <section className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border flex justify-between items-start gap-4 bg-muted/30">
            <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
            {action}
        </div>
        <div className="p-6 space-y-6">
            {children}
        </div>
    </section>
);

interface SettingsItemProps {
    label: string;
    description?: string;
    children: React.ReactNode;
    layout?: 'row' | 'col';
    className?: string;
}

const SettingsItem = ({ label, description, children, layout = 'row', className }: SettingsItemProps) => (
    <div className={cn("flex gap-4", layout === 'row' ? "flex-row items-center justify-between" : "flex-col", className)}>
        <div className="space-y-1 flex-1">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className={cn(layout === 'col' && "mt-3", "flex-shrink-0")}>
            {children}
        </div>
    </div>
);

export default function SettingsPage() {
    const router = useRouter();
    const { theme, setTheme } = useTheme();


    const [models, setModels] = useState<ModelConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingKey, setIsSavingKey] = useState(false);
    const [isSavingReplicateKey, setIsSavingReplicateKey] = useState(false);


    // Model Form State
    const [isEditingModel, setIsEditingModel] = useState(false);
    const [currentModel, setCurrentModel] = useState<Partial<ModelConfig>>({});
    const [configJson, setConfigJson] = useState('');

    // Enhancement Form State (for modal)
    const [enhancementPrompt, setEnhancementPrompt] = useState('');
    const [enhancementTemperature, setEnhancementTemperature] = useState(0.3);
    const [enhancementThinking, setEnhancementThinking] = useState(false);
    const [enhancementSearch, setEnhancementSearch] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            await initializeDefaultModels();
            const loadedModels = await getModels();


            setModels(loadedModels);

        } catch (error) {
            console.error("Failed to load settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getDefaultEnhancementPrompt = () => {
        return `### SYSTEM ROLE ###
You are an expert AI Prompt Engineer specializing in creating "Accessible Coloring Book" pages for seniors and beginners.
Your goal is to convert simple user inputs into highly optimized text-to-image prompts.

### TARGET AUDIENCE SPECS ###
The images are for people with dementia or motor control limitations. The style MUST strictly adhere to:
1.  **Thick, Bold Outlines:** For visibility.
2.  **Large Empty Spaces:** Easy to color without going over the lines.
3.  **Low Complexity:** No tiny details, no "mandala" patterns, no shading, no greyscale.
4.  **Friendly/Calm Subjects:** If the subject is alive, it must look friendly.

### OUTPUT FORMAT ###
For every input, output ONLY the final prompt block following this exact template:

\`Bold thick line art drawing of [SUBJECT MODIFIED FOR SIMPLICITY], centered, very simple shapes, large empty spaces for easy coloring, low detail, high contrast, black and white, vector style, white background --ar 17:22 --no shading, complex patterns, greyscale, text, realistic\`

*(Note: --ar 17:22 sets the aspect ratio to 8.5:11 Portrait)*

### FEW-SHOT EXAMPLES ###

Input: a snowman wearing a scarf
Output: Bold thick line art drawing of a cheerful snowman wearing a scarf, isolated, very simple shapes, large empty spaces for easy coloring, low detail, high contrast, black and white, vector style, white background --ar 17:22 --no shading, complex patterns, greyscale, text, realistic

Input: a basket of flowers
Output: Bold thick line art drawing of a simple woven basket holding three large tulips, centered, distinct outlines, very simple shapes, large empty spaces for easy coloring, low detail, high contrast, black and white, vector style, white background --ar 17:22 --no shading, complex patterns, greyscale, text, realistic

Input: a sleeping cat
Output: Bold thick line art drawing of a cute cat sleeping on a rug, minimal details, very simple shapes, large empty spaces for easy coloring, low detail, high contrast, black and white, vector style, white background --ar 17:22 --no shading, complex patterns, greyscale, text, realistic

### YOUR TASK ###
Convert the following Input into the optimized Output format.`;
    };



    const handleEditModel = (model: ModelConfig) => {
        setCurrentModel(model);

        // Extract enhancement settings from config
        const config = model.config || {};
        const {
            enhancement_prompt,
            enhancement_temperature,
            enhancement_thinking,
            enhancement_search,
            ...restConfig
        } = config;

        setEnhancementPrompt(enhancement_prompt || getDefaultEnhancementPrompt());
        setEnhancementTemperature(enhancement_temperature ?? 0.3);
        setEnhancementThinking(enhancement_thinking ?? false);
        setEnhancementSearch(enhancement_search ?? false);

        setConfigJson(JSON.stringify(restConfig, null, 2));
        setIsEditingModel(true);
    };

    const handleAddNewModel = (type: 'image' | 'text') => {
        setCurrentModel({
            name: '',
            dailyLimit: 100,
            tpm: 20,
            temperature: 1.0,
            topP: 0.95,
            type: type,
            provider: 'gemini',
            config: {}
        });

        // Defaults for new model
        setEnhancementPrompt(getDefaultEnhancementPrompt());
        setEnhancementTemperature(0.3);
        setEnhancementThinking(false);
        setEnhancementSearch(false);

        setConfigJson('{}');
        setIsEditingModel(true);
    };

    const handleSaveModel = async () => {
        if (!currentModel.name || !currentModel.dailyLimit || !currentModel.tpm || !currentModel.type) {
            alert("Please fill in all fields.");
            return;
        }

        try {
            let baseConfig = {};
            try {
                baseConfig = JSON.parse(configJson);
            } catch (e) {
                alert("Invalid JSON configuration.");
                return;
            }

            // Merge enhancement settings into config
            const config = {
                ...baseConfig,
                enhancement_prompt: enhancementPrompt,
                enhancement_temperature: enhancementTemperature,
                enhancement_thinking: enhancementThinking,
                enhancement_search: enhancementSearch
            };

            const modelToSave = { ...currentModel, config };

            if (currentModel.id) {
                // Update existing
                await updateModel(modelToSave as ModelConfig);
            } else {
                // Add new
                await addModel(modelToSave as Omit<ModelConfig, 'id'>);
            }
            setIsEditingModel(false);
            setCurrentModel({});
            setConfigJson('');
            loadSettings(); // Reload list
        } catch (error) {
            console.error("Failed to save model:", error);
            alert("Failed to save model.");
        }
    };

    const handleDeleteModel = async (id: string) => {
        if (confirm("Are you sure you want to delete this model?")) {
            try {
                await deleteModel(id);
                loadSettings();
            } catch (error: any) {
                console.error("Failed to delete model:", error);
                alert(error.message || "Failed to delete model.");
            }
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            await setDefaultModel(id);
            loadSettings();
        } catch (error) {
            console.error("Failed to set default model:", error);
        }
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading settings...</div>;
    }

    const imageModels = models.filter(m => m.type === 'image');
    const textModels = models.filter(m => m.type === 'text');

    return (
        <div className="h-screen overflow-y-auto bg-background font-[family-name:var(--font-geist-sans)]">
            <div className="max-w-5xl mx-auto p-8 space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold">Settings</h1>
                        <p className="text-muted-foreground mt-1">Manage your preferences and model configurations</p>
                    </div>
                </div>

                {/* Appearance */}
                <SettingsSection title="Appearance" description="Customize the look and feel of the application.">
                    <SettingsItem label="Theme" description="Select your preferred color theme.">
                        <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-lg">
                            <button
                                onClick={() => setTheme('light')}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                    theme === 'light' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Sun size={16} />
                                Light
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                    theme === 'dark' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Moon size={16} />
                                Dark
                            </button>
                            <button
                                onClick={() => setTheme('system')}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                    theme === 'system' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Monitor size={16} />
                                System
                            </button>
                        </div>
                    </SettingsItem>
                </SettingsSection>



                {/* Image Models */}
                <SettingsSection
                    title="Image Models"
                    description="Manage models used for image generation."
                    action={
                        <button
                            onClick={() => handleAddNewModel('image')}
                            className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity flex items-center gap-2 text-sm font-medium"
                        >
                            <Plus size={16} />
                            Add Model
                        </button>
                    }
                >
                    <div className="grid gap-4">
                        {imageModels.map((model) => (
                            <div key={model.id} className={cn(
                                "flex items-center justify-between p-4 border rounded-lg transition-all",
                                model.isDefault ? "bg-primary/5 border-primary/30" : "bg-card border-border hover:border-primary/20"
                            )}>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium">{model.name}</h3>
                                        {model.isDefault && (
                                            <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                                <Check size={10} /> Default
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                                        <span title="Daily Limit">Limit: {model.dailyLimit}</span>
                                        <span title="Tokens Per Minute">TPM: {model.tpm}</span>
                                        <span title="Temperature">Temp: {model.temperature ?? 'Def'}</span>
                                        <span title="Top P">Top P: {model.topP ?? 'Def'}</span>
                                        <span title="Provider" className="uppercase text-xs border border-border px-1.5 rounded bg-muted/50">{model.provider || 'gemini'}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {!model.isDefault && (
                                        <button
                                            onClick={() => handleSetDefault(model.id)}
                                            className="px-3 py-1.5 text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                                        >
                                            Set Default
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEditModel(model)}
                                        className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                                        title="Edit Model"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteModel(model.id)}
                                        disabled={model.isDefault}
                                        className={cn(
                                            "p-2 rounded-md transition-colors",
                                            model.isDefault
                                                ? "text-muted-foreground/30 cursor-not-allowed"
                                                : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                        )}
                                        title={model.isDefault ? "Cannot delete default model" : "Delete Model"}
                                    >
                                        {model.isDefault ? <ShieldAlert size={16} /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {imageModels.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                                No image models configured.
                            </div>
                        )}
                    </div>
                </SettingsSection>

                {/* Text Models */}
                <SettingsSection
                    title="Text Models"
                    description="Manage models used for prompt enhancement."
                    action={
                        <button
                            onClick={() => handleAddNewModel('text')}
                            className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity flex items-center gap-2 text-sm font-medium"
                        >
                            <Plus size={16} />
                            Add Model
                        </button>
                    }
                >
                    <div className="grid gap-4">
                        {textModels.map((model) => (
                            <div key={model.id} className={cn(
                                "flex items-center justify-between p-4 border rounded-lg transition-all",
                                model.isDefault ? "bg-primary/5 border-primary/30" : "bg-card border-border hover:border-primary/20"
                            )}>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-medium">{model.name}</h3>
                                        {model.isDefault && (
                                            <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                                <Check size={10} /> Default
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                                        <span title="Daily Limit">Limit: {model.dailyLimit}</span>
                                        <span title="Tokens Per Minute">TPM: {model.tpm}</span>
                                        <span title="Temperature">Temp: {model.temperature ?? 'Def'}</span>
                                        <span title="Top P">Top P: {model.topP ?? 'Def'}</span>
                                        <span title="Provider" className="uppercase text-xs border border-border px-1.5 rounded bg-muted/50">{model.provider || 'gemini'}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {!model.isDefault && (
                                        <button
                                            onClick={() => handleSetDefault(model.id)}
                                            className="px-3 py-1.5 text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                                        >
                                            Set Default
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEditModel(model)}
                                        className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                                        title="Edit Model"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteModel(model.id)}
                                        disabled={model.isDefault}
                                        className={cn(
                                            "p-2 rounded-md transition-colors",
                                            model.isDefault
                                                ? "text-muted-foreground/30 cursor-not-allowed"
                                                : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                        )}
                                        title={model.isDefault ? "Cannot delete default model" : "Delete Model"}
                                    >
                                        {model.isDefault ? <ShieldAlert size={16} /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {textModels.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                                No text models configured.
                            </div>
                        )}
                    </div>
                </SettingsSection>

                {/* Edit/Add Modal */}
                {isEditingModel && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl flex flex-col max-h-[90vh]">
                            <div className="flex justify-between items-center p-6 border-b border-border">
                                <h3 className="text-lg font-semibold">
                                    {currentModel.id ? 'Edit Model' : 'Add New Model'}
                                </h3>
                                <button
                                    onClick={() => setIsEditingModel(false)}
                                    className="p-1 hover:bg-muted rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider border-b border-border pb-2">Basic Configuration</h4>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Model Type</label>
                                            <select
                                                value={currentModel.type}
                                                onChange={(e) => setCurrentModel(prev => ({ ...prev, type: e.target.value as 'image' | 'text' }))}
                                                className="w-full bg-background border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                                            >
                                                <option value="image">Image Model</option>
                                                <option value="text">Text Model</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Model Name</label>
                                            <input
                                                type="text"
                                                value={currentModel.name || ''}
                                                onChange={(e) => setCurrentModel(prev => ({ ...prev, name: e.target.value }))}
                                                placeholder="e.g., gemini-1.5-pro"
                                                className="w-full bg-background border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Provider</label>
                                            <select
                                                value={currentModel.provider || 'gemini'}
                                                onChange={(e) => setCurrentModel(prev => ({ ...prev, provider: e.target.value as 'gemini' | 'replicate' }))}
                                                className="w-full bg-background border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                                            >
                                                <option value="gemini">Gemini</option>
                                                <option value="replicate">Replicate</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1.5">Daily Limit</label>
                                                <input
                                                    type="number"
                                                    value={currentModel.dailyLimit || ''}
                                                    onChange={(e) => setCurrentModel(prev => ({ ...prev, dailyLimit: Number(e.target.value) }))}
                                                    className="w-full bg-background border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1.5">TPM</label>
                                                <input
                                                    type="number"
                                                    value={currentModel.tpm || ''}
                                                    onChange={(e) => setCurrentModel(prev => ({ ...prev, tpm: Number(e.target.value) }))}
                                                    className="w-full bg-background border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1.5">Temperature</label>
                                                <input
                                                    step="0.1"
                                                    min="0"
                                                    max="2"
                                                    value={currentModel.temperature ?? 1.0}
                                                    onChange={(e) => setCurrentModel(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                                                    className="w-full bg-background border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1.5">Top P</label>
                                                <input
                                                    type="number"
                                                    step="0.05"
                                                    min="0"
                                                    max="1"
                                                    value={currentModel.topP ?? 0.95}
                                                    onChange={(e) => setCurrentModel(prev => ({ ...prev, topP: Number(e.target.value) }))}
                                                    className="w-full bg-background border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {currentModel.type === 'image' && (
                                        <div className="space-y-4">
                                            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider border-b border-border pb-2">Enhancement Settings</h4>

                                            <div>
                                                <label className="block text-sm font-medium mb-1.5">Enhancement Prompt</label>
                                                <textarea
                                                    value={enhancementPrompt}
                                                    onChange={(e) => setEnhancementPrompt(e.target.value)}
                                                    rows={6}
                                                    className="w-full bg-background border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none font-mono text-xs resize-y"
                                                />
                                                <button
                                                    onClick={() => setEnhancementPrompt(getDefaultEnhancementPrompt())}
                                                    className="text-xs text-primary hover:underline mt-1"
                                                >
                                                    Reset to Default
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-1.5">Enh. Temp</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        max="2"
                                                        value={enhancementTemperature}
                                                        onChange={(e) => setEnhancementTemperature(Number(e.target.value))}
                                                        className="w-full bg-background border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-2 pt-6">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            id="thinking"
                                                            checked={enhancementThinking}
                                                            onChange={(e) => setEnhancementThinking(e.target.checked)}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <label htmlFor="thinking" className="text-sm">Thinking</label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            id="search"
                                                            checked={enhancementSearch}
                                                            onChange={(e) => setEnhancementSearch(e.target.checked)}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <label htmlFor="search" className="text-sm">Search</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Additional Configuration (JSON)</label>
                                    <textarea
                                        value={configJson}
                                        onChange={(e) => setConfigJson(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none font-mono text-xs h-24"
                                        placeholder="{ ... }"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        Enter valid JSON configuration.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 p-6 border-t border-border bg-muted/10">
                                <button
                                    onClick={() => setIsEditingModel(false)}
                                    className="px-4 py-2 hover:bg-muted rounded-md transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveModel}
                                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity text-sm font-medium"
                                >
                                    Save Model
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
