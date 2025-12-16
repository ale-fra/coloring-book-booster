"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PresetManager } from '../PresetManager';
import { PromptInput } from '../PromptInput';
import { PromptList } from '../PromptList';
import { GenerationService, type GenerationResult } from '@/lib/generation';
import { type Preset, type ModelConfig, type HistoryItem } from '@/lib/db';
import {
    getApiKey,
    getReplicateApiKey,
    getModels,
    initializeDefaultModels,
    getCredits,
    deductCredits,
    addHistoryItem,
    updateHistoryItem,
    getHistory,
    getModelPreferences,
    saveModelPreferences
} from '@/app/actions';
import { Palette } from 'lucide-react';

interface GenerationPageProps {
    spaceId?: string;
    spaceName?: string;
    spacePrompt?: string;
}

export function GenerationPage({ spaceId, spaceName, spacePrompt }: GenerationPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const historyIdParam = searchParams.get('historyId');

    const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
    const [prompts, setPrompts] = useState<string[]>([]);
    const [results, setResults] = useState<GenerationResult[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

    // Settings State
    const [apiKey, setApiKey] = useState<string | undefined>(undefined);
    const [replicateApiKey, setReplicateApiKey] = useState<string | undefined>(undefined);
    const [models, setModels] = useState<ModelConfig[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string>('');
    const [selectedTextModelId, setSelectedTextModelId] = useState<string>('');
    const [isPresetEnabled, setIsPresetEnabled] = useState(!!spaceId); // Default to true if spaceId is present
    const [aspectRatio, setAspectRatio] = useState<string>('1:1');
    const [customWidth, setCustomWidth] = useState<number>(1024);
    const [customHeight, setCustomHeight] = useState<number>(1024);
    const [credits, setCredits] = useState<number>(0);

    // Ref to keep track of latest results for async updates
    const resultsRef = useRef(results);

    useEffect(() => {
        resultsRef.current = results;
    }, [results]);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (historyIdParam) {
            loadHistoryItem(historyIdParam);
        }
    }, [historyIdParam]);

    // If we are in a Space, we treat the Space Prompt as a "Virtual Preset"
    useEffect(() => {
        if (spaceId && spacePrompt) {
            setIsPresetEnabled(true);
            // We don't set selectedPreset because we want to lock it to the space
            // But for the logic below that uses selectedPreset, we might need to adapt it
        }
    }, [spaceId, spacePrompt]);

    const loadSettings = async () => {
        try {
            await initializeDefaultModels();
            const key = await getApiKey();
            const repKey = await getReplicateApiKey();
            const loadedModels = await getModels();

            const currentCredits = await getCredits();

            // Filter for image models only
            const imageModels = loadedModels.filter(m => m.type === 'image');

            setApiKey(key ?? undefined);
            setReplicateApiKey(repKey ?? undefined);
            setModels(imageModels);
            setCredits(currentCredits);


            // Set default image model
            if (imageModels.length > 0) {
                const defaultModel = imageModels.find(m => m.isDefault);
                setSelectedModelId(defaultModel ? defaultModel.id : imageModels[0].id);
            }

            // Set default text model
            const textModels = loadedModels.filter(m => m.type === 'text');
            if (textModels.length > 0) {
                const defaultTextModel = textModels.find(m => m.isDefault);
                setSelectedTextModelId(defaultTextModel ? defaultTextModel.id : textModels[0].id);
            }
        } catch (error) {
            console.error("Failed to load settings:", error);
        }

    };

    useEffect(() => {
        if (selectedModelId) {
            loadModelPreferences(selectedModelId);
        }
    }, [selectedModelId]);

    const loadModelPreferences = async (modelId: string) => {
        try {
            const prefs = await getModelPreferences(modelId);
            const model = models.find(m => m.id === modelId);
            let supportedRatios = model?.config?.aspect_ratio;
            if (!Array.isArray(supportedRatios)) {
                supportedRatios = ["1:1", "4:5", "5:4", "custom"];
            }

            if (prefs.aspectRatio) {
                setAspectRatio(prefs.aspectRatio);
            } else {
                // Default to first supported ratio or 1:1
                setAspectRatio(supportedRatios[0] || '1:1');
            }

            if (prefs.width) setCustomWidth(prefs.width);
            if (prefs.height) setCustomHeight(prefs.height);
        } catch (e) {
            console.error("Failed to load model prefs", e);
        }
    };

    const handleAspectRatioChange = (val: string) => {
        setAspectRatio(val);
        saveModelPreferences(selectedModelId, { aspectRatio: val, width: customWidth, height: customHeight });
    };

    const handleDimensionChange = (type: 'width' | 'height', val: number) => {
        let newVal = val;
        if (newVal > 1024) newVal = 1024;

        if (type === 'width') setCustomWidth(newVal);
        else setCustomHeight(newVal);

        const w = type === 'width' ? newVal : customWidth;
        const h = type === 'height' ? newVal : customHeight;
        saveModelPreferences(selectedModelId, { aspectRatio, width: w, height: h });
    };

    const loadHistoryItem = async (id: string) => {
        try {
            const history = await getHistory();
            const item = history.find((h: HistoryItem) => h.id === id);
            if (item) {
                setResults(item.results);
                setPrompts(item.results.map((r: GenerationResult) => r.prompt));
                setCurrentHistoryId(item.id);
            }
        } catch (error) {
            console.error("Failed to load history item:", error);
        }
    };

    const handlePromptsLoaded = (newPrompts: string[]) => {
        setPrompts(prev => [...prev, ...newPrompts]);
        if (results.length > 0) {
            setResults([]);
            setCurrentHistoryId(null);
        }
    };

    const handleUpdatePrompt = (index: number, newPrompt: string) => {
        setPrompts(prev => {
            const newPrompts = [...prev];
            newPrompts[index] = newPrompt;
            return newPrompts;
        });
    };

    const handleDeletePrompt = (index: number) => {
        setPrompts(prev => prev.filter((_, i) => i !== index));
    };

    const getEffectiveSystemPrompt = () => {
        if (spaceId && spacePrompt) {
            return spacePrompt;
        }
        if (isPresetEnabled && selectedPreset) {
            return selectedPreset.prompt;
        }
        return undefined;
    };

    const handleGenerate = async () => {
        const selectedModel = models.find(m => m.id === selectedModelId);
        if (!selectedModel) {
            alert('Please select a model');
            return;
        }

        if (selectedModel.provider === 'replicate') {
            if (!replicateApiKey) {
                alert('Please configure your Replicate API Key in Settings');
                router.push('/settings');
                return;
            }
        } else {
            if (!apiKey) {
                alert('Please configure your Gemini API Key in Settings');
                router.push('/settings');
                return;
            }
        }

        const systemPrompt = getEffectiveSystemPrompt();

        if (isPresetEnabled && !systemPrompt) {
            // If preset is enabled but no prompt (and not in space), warn
            if (!spaceId) {
                alert('Please select a system prompt preset or disable the system prompt option');
                return;
            }
        }

        if (prompts.length === 0) {
            alert('Please load some prompts');
            return;
        }

        if (credits < prompts.length) {
            alert(`Not enough credits. You have ${credits} credits but need ${prompts.length}.`);
            return;
        }

        setIsGenerating(true);
        setResults(prompts.map(p => ({ prompt: p, isLoading: true })));
        setCurrentHistoryId(null);

        const tpm = selectedModel.tpm || 20;
        const batchSize = Math.min(Math.floor(tpm / 2), 100);
        const service = new GenerationService(apiKey || '', selectedModel.name, tpm, selectedModel.temperature, selectedModel.topP, aspectRatio, customWidth, customHeight, selectedModel.provider, replicateApiKey, selectedModel.config);


        let allResults: GenerationResult[] = new Array(prompts.length).fill(null).map((_, i) => ({ prompt: prompts[i], isLoading: true }));

        try {
            for (let i = 0; i < prompts.length; i += batchSize) {
                const batch = prompts.slice(i, i + batchSize);
                const batchIndices = batch.map((_, idx) => i + idx);

                const promises = batch.map((prompt, idx) =>
                    service.generateImage(prompt, systemPrompt)
                        .then(res => ({ res, index: batchIndices[idx] }))
                );

                const batchResults = await Promise.all(promises);

                setResults(prev => {
                    const next = [...prev];
                    batchResults.forEach(({ res, index }) => {
                        next[index] = res;
                    });
                    return next;
                });

                batchResults.forEach(({ res, index }) => {
                    allResults[index] = res;
                });

                const successfulInBatch = batchResults.filter(({ res }) => res.imageUrl).length;
                if (successfulInBatch > 0) {
                    setCredits(prev => prev - successfulInBatch);
                }
            }

            const totalSuccessful = allResults.filter(r => r.imageUrl).length;

            if (totalSuccessful > 0) {
                try {
                    const newCredits = await deductCredits(totalSuccessful);
                    setCredits(newCredits);
                    window.dispatchEvent(new Event('credits-updated'));
                } catch (err) {
                    console.error("Failed to deduct credits:", err);
                }
            }

            try {
                const newItem = await addHistoryItem({
                    presetName: spaceId ? (spaceName || "Space Style") : (selectedPreset ? selectedPreset.title : "No Preset"),
                    modelName: selectedModel.name,
                    results: allResults
                });
                setCurrentHistoryId(newItem.id);
            } catch (historyError) {
                console.error('[DEBUG] Failed to save history:', historyError);
            }

        } catch (error) {
            console.error("Generation failed", error);
            alert("An error occurred during generation.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEnhancePrompts = async () => {
        setIsGenerating(true);

        try {
            // If we are in a Space, use the Space Standardization API
            if (spaceId) {
                const enhancedPrompts: string[] = [];
                for (let i = 0; i < prompts.length; i++) {
                    try {
                        const response = await fetch(`/api/spaces/${spaceId}/standardize`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userRequest: prompts[i] })
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Failed to standardize prompt');
                        }

                        const data = await response.json();
                        enhancedPrompts.push(data.prompt);
                    } catch (error) {
                        console.error(`Failed to standardize prompt ${i}:`, error);
                        enhancedPrompts.push(prompts[i]);
                    }
                }
                setPrompts(enhancedPrompts);
                alert(`Successfully standardized ${enhancedPrompts.length} prompts for this Space!`);
                return;
            }

            // Otherwise use the generic enhancement
            if (!apiKey) {
                alert('Please configure your Gemini API Key in Settings');
                router.push('/settings');
                return;
            }

            const allModels = await getModels();
            const textModel = allModels.find(m => m.id === selectedTextModelId && m.type === 'text');

            if (!textModel) {
                alert('No text model configured. Please check your settings.');
                return;
            }

            const config = textModel.config || {};
            const systemPrompt = config.enhancement_prompt || getDefaultEnhancementPrompt();
            const temperature = config.enhancement_temperature ?? 0.3;
            const thinkingEnabled = config.enhancement_thinking ?? false;
            const searchEnabled = config.enhancement_search ?? false;

            const service = new GenerationService(apiKey, textModel.name, textModel.tpm || 60);
            const enhancedPrompts: string[] = [];

            for (let i = 0; i < prompts.length; i++) {
                try {
                    const enhanced = await service.enhancePrompt(
                        prompts[i],
                        textModel.name,
                        systemPrompt,
                        temperature,
                        thinkingEnabled,
                        searchEnabled
                    );
                    enhancedPrompts.push(enhanced);
                } catch (error) {
                    console.error(`Failed to enhance prompt ${i}:`, error);
                    enhancedPrompts.push(prompts[i]);
                }
            }

            setPrompts(enhancedPrompts);
            alert(`Successfully enhanced ${enhancedPrompts.length} prompts!`);
        } catch (error) {
            console.error('Enhancement failed:', error);
            alert('Failed to enhance prompts. Please try again.');
        } finally {
            setIsGenerating(false);
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


    const handleRegenerate = async (index: number, newPrompt: string) => {
        const selectedModel = models.find(m => m.id === selectedModelId);
        if (!selectedModel) return;

        if (selectedModel.provider === 'replicate' && !replicateApiKey) return;
        if (selectedModel.provider !== 'replicate' && !apiKey) return;

        if (credits < 1) {
            alert("Not enough credits to regenerate.");
            return;
        }

        setResults(prev => {
            const newResults = [...prev];
            newResults[index] = { ...newResults[index], isLoading: true, error: undefined };
            return newResults;
        });

        const service = new GenerationService(apiKey || '', selectedModel.name, selectedModel.tpm, selectedModel.temperature, selectedModel.topP, aspectRatio, customWidth, customHeight, selectedModel.provider, replicateApiKey, selectedModel.config);

        try {
            const systemPrompt = getEffectiveSystemPrompt();
            const result = await service.generateImage(newPrompt, systemPrompt);

            const currentResults = [...resultsRef.current];
            const oldResult = currentResults[index];
            const variants = oldResult.variants ? [...oldResult.variants] : (oldResult.imageUrl ? [{ imageUrl: oldResult.imageUrl, prompt: oldResult.prompt }] : []);

            if (result.imageUrl) {
                variants.push({ imageUrl: result.imageUrl, prompt: result.prompt });

                try {
                    const newCredits = await deductCredits(1);
                    setCredits(newCredits);
                    window.dispatchEvent(new Event('credits-updated'));
                } catch (err) {
                    console.error("Failed to deduct credit:", err);
                }
            }

            const updatedResult = {
                ...result,
                variants,
                selectedVariantIndex: variants.length - 1,
                isLoading: false
            };

            currentResults[index] = updatedResult;
            setResults(currentResults);

            if (currentHistoryId && selectedModel) {
                await updateHistoryItem({
                    id: currentHistoryId,
                    timestamp: Date.now(),
                    presetName: spaceId ? (spaceName || "Space Style") : (selectedPreset ? selectedPreset.title : "No Preset"),
                    modelName: selectedModel.name,
                    results: currentResults
                });
            }

        } catch (error: any) {
            setResults(prev => {
                const newResults = [...prev];
                newResults[index] = {
                    ...newResults[index],
                    isLoading: false,
                    error: error.message || "Regeneration failed"
                };
                return newResults;
            });
        }
    };

    const handleVariantChange = (index: number, variantIndex: number) => {
        setResults(prev => {
            const newResults = [...prev];
            newResults[index] = { ...newResults[index], selectedVariantIndex: variantIndex };
            return newResults;
        });
    };

    return (
        <div className="flex flex-col h-screen bg-background relative">

            {/* Top Bar (Model & Preset) - Hidden when results are displayed */}
            {results.length === 0 && (
                <header className="flex-none p-4 border-b border-border flex justify-between items-center bg-background/50 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-4">
                        {spaceId ? (
                            <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-md">
                                <Palette className="h-4 w-4" />
                                <span className="text-sm font-medium">Style Locked: {spaceName}</span>
                            </div>
                        ) : (
                            <PresetManager
                                onSelect={setSelectedPreset}
                                selectedPresetId={selectedPreset?.id}
                                isEnabled={isPresetEnabled}
                                onToggle={setIsPresetEnabled}
                                compact
                            />
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedModelId}
                            onChange={(e) => setSelectedModelId(e.target.value)}
                            className="bg-secondary border-none rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-primary outline-none"
                        >
                            {models.map(model => (
                                <option key={model.id} value={model.id}>
                                    {model.name}
                                </option>
                            ))}
                        </select>

                        {/* Aspect Ratio Selector */}
                        <div className="flex items-center gap-2 border-l border-border pl-4 ml-2">
                            <select
                                value={aspectRatio}
                                onChange={(e) => handleAspectRatioChange(e.target.value)}
                                className="bg-secondary border-none rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-primary outline-none"
                                title="Aspect Ratio"
                            >
                                {(() => {
                                    const model = models.find(m => m.id === selectedModelId);
                                    let ratios = model?.config?.aspect_ratio;
                                    if (!Array.isArray(ratios)) {
                                        ratios = ["1:1", "4:5", "5:4", "16:9", "custom"];
                                    }
                                    return ratios.map((ar: string) => (
                                        <option key={ar} value={ar}>{ar}</option>
                                    ));
                                })()}
                            </select>

                            {aspectRatio === 'custom' && (
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        value={customWidth}
                                        onChange={(e) => handleDimensionChange('width', parseInt(e.target.value) || 0)}
                                        className="w-16 bg-secondary border-none rounded-md px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary outline-none"
                                        placeholder="W"
                                        max={1024}
                                    />
                                    <span className="text-muted-foreground">x</span>
                                    <input
                                        type="number"
                                        value={customHeight}
                                        onChange={(e) => handleDimensionChange('height', parseInt(e.target.value) || 0)}
                                        className="w-16 bg-secondary border-none rounded-md px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary outline-none"
                                        placeholder="H"
                                        max={1024}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </header>
            )}

            {/* Main Content Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
                {prompts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                        <div className="bg-secondary/50 p-6 rounded-full">
                            <Palette size={48} className="opacity-50" />
                        </div>
                        <h2 className="text-2xl font-semibold text-foreground">
                            {spaceId ? `Create with ${spaceName}` : "Welcome to Booster AI"}
                        </h2>
                        <p className="max-w-md text-center">
                            Start by entering your prompts below. You can generate multiple images at once.
                        </p>
                    </div>
                ) : (
                    <PromptList
                        prompts={prompts}
                        results={results}
                        isGenerating={isGenerating}
                        onUpdatePrompt={handleUpdatePrompt}
                        onDeletePrompt={handleDeletePrompt}
                        onGenerate={handleGenerate}
                        onEnhancePrompts={handleEnhancePrompts}
                        onRegenerate={handleRegenerate}
                        onVariantChange={handleVariantChange}
                    />
                )}
            </div>

            {/* Bottom Input Area (Fixed) - Hidden when results are displayed */}
            {results.length === 0 && (
                <div className="flex-none bg-background p-4 pt-2">
                    <PromptInput
                        onPromptsLoaded={handlePromptsLoaded}
                        isLoading={isGenerating}
                    />
                </div>
            )}
        </div>
    );
}
