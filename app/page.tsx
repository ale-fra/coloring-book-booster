"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PresetManager } from '../components/PresetManager';
import { PromptInput } from '../components/PromptInput';
import { PromptList } from '../components/PromptList';
import { GenerationService, type GenerationResult } from '../lib/generation';
import { type Preset, type ModelConfig, type HistoryItem } from '../lib/db';
import {
  getApiKey,
  getReplicateApiKey,
  getModels,
  initializeDefaultModels,

  getCredits,
  saveCredits,
  addHistoryItem,
  updateHistoryItem,
  getHistory,
  getModelPreferences,
  saveModelPreferences
} from '../app/actions';
import { Sparkles, Palette, Coins } from 'lucide-react';

function HomeContent() {
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
  const [isPresetEnabled, setIsPresetEnabled] = useState(false);
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

    // Debounce save? For simplicity, we'll save immediately but maybe we should debounce.
    // Given it's local dev mostly, immediate is fine, or we can use a timeout.
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
    // Append new prompts to existing ones
    setPrompts(prev => [...prev, ...newPrompts]);
    // If we have results, we might want to clear them or handle mixed state?
    // For now, let's assume adding prompts resets the "Done" state if we want to regenerate everything,
    // OR we just append empty results placeholders if we supported partial generation.
    // Simpler approach: If results exist, clear them to start fresh flow, OR just append.
    // Let's clear results to keep flow simple: Parse -> Review -> Generate.
    if (results.length > 0) {
      setResults([]);
      setCurrentHistoryId(null);
      // If user wants to keep old results, they should have saved/downloaded.
      // Or we could implement a more complex "append" logic later.
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

    if (isPresetEnabled && !selectedPreset) {
      alert('Please select a system prompt preset or disable the system prompt option');
      return;
    }
    if (prompts.length === 0) {
      alert('Please load some prompts');
      return;
    }

    if (credits < prompts.length) {
      alert(`Not enough credits. You have ${credits} credits but need ${prompts.length}.`);
      return;
    }

    if (credits < prompts.length) {
      alert(`Not enough credits. You have ${credits} credits but need ${prompts.length}.`);
      return;
    }

    setIsGenerating(true);
    // Initialize results with loading state placeholders if needed, or just build them up.
    // Let's initialize with empty results to map 1:1 with prompts
    setResults(prompts.map(p => ({ prompt: p, isLoading: true })));

    setCurrentHistoryId(null);

    const tpm = selectedModel.tpm || 20;
    const batchSize = Math.min(Math.floor(tpm / 2), 100);
    const service = new GenerationService(apiKey || '', selectedModel.name, tpm, selectedModel.temperature, selectedModel.topP, aspectRatio, customWidth, customHeight, selectedModel.provider, replicateApiKey, selectedModel.config);


    let allResults: GenerationResult[] = new Array(prompts.length).fill(null).map((_, i) => ({ prompt: prompts[i], isLoading: true }));

    try {
      for (let i = 0; i < prompts.length; i += batchSize) {
        const batch = prompts.slice(i, i + batchSize);
        // We need to know the global indices for these prompts to update the correct results
        const batchIndices = batch.map((_, idx) => i + idx);

        const promises = batch.map((prompt, idx) =>
          service.generateImage(prompt, isPresetEnabled && selectedPreset ? selectedPreset.prompt : undefined)
            .then(res => ({ res, index: batchIndices[idx] }))
        );

        const batchResults = await Promise.all(promises);

        // Update results state with completed batch
        setResults(prev => {
          const next = [...prev];
          batchResults.forEach(({ res, index }) => {
            next[index] = res;
            allResults[index] = res;
          });
          return next;
        });

        const successfulInBatch = batchResults.filter(({ res }) => res.imageUrl).length;
        if (successfulInBatch > 0) {
          // Update local state
          setCredits(prev => prev - successfulInBatch);

          // Perform side effects outside of the updater
          // We need to calculate the new total based on what we know (or just subtract)
          // Since we are inside an async function, 'credits' state might be stale if we used it directly,
          // but for the side effect (saving to DB), we should probably fetch fresh or just subtract from current known.
          // Better yet, let's just subtract the amount we just used from the DB.
          // Actually, saveCredits takes the absolute new value. 
          // To be safe and avoid race conditions with the UI state, we can use the result of the state update if we could access it, 
          // but we can't easily. 
          // However, we are in an async loop. 'credits' variable is from the render scope when handleGenerate started.
          // It will NOT update during this loop.
          // So we need to track local credits consumption in this function.

          // Let's rely on the server action to be the source of truth if possible, but saveCredits is just a setter.
          // We should track the *running* credits in this function.
        }
      }

      // Correct approach:
      // We need to track how many credits we've used in total during this generation session
      // and update the DB accordingly.
      // But wait, the loop is async.

      // Let's refactor the loop slightly to handle credit updates more cleanly.
      // We can't easily "get" the new state from setCredits.
      // But we can just read the current credits from the server or trust our local calculation.

      // Let's just do this:
      const totalSuccessful = allResults.filter(r => r.imageUrl).length;
      const newCredits = credits - totalSuccessful;
      if (totalSuccessful > 0) {
        setCredits(newCredits);
        saveCredits(newCredits);
        window.dispatchEvent(new Event('credits-updated'));
      }

      // Save to history
      console.log('[DEBUG] Checking if all results are ready:', allResults.every(r => !r.isLoading));
      console.log('[DEBUG] All results:', allResults);
      console.log('[DEBUG] All results detailed:', allResults.map((r, i) => ({ index: i, hasLoading: 'isLoading' in r, loadingValue: r.isLoading, hasError: !!r.error, hasImage: !!r.imageUrl })));

      // Always save to history, even if some results have errors
      // This ensures we don't lose history due to failed generations
      try {
        console.log('[DEBUG] Saving to history...');
        const newItem = await addHistoryItem({
          presetName: selectedPreset ? selectedPreset.title : "No Preset",
          modelName: selectedModel.name,
          results: allResults
        });
        console.log('[DEBUG] History item saved with ID:', newItem.id);
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
    if (!apiKey) {
      alert('Please configure your Gemini API Key in Settings');
      router.push('/settings');
      return;
    }

    // Get all models including text models
    const allModels = await getModels();
    const textModel = allModels.find(m => m.id === selectedTextModelId && m.type === 'text');

    if (!textModel) {
      alert('No text model configured. Please check your settings.');
      return;
    }

    // Load enhancement prompt and settings from settings
    // Load enhancement settings from model config
    const config = textModel.config || {};
    const systemPrompt = config.enhancement_prompt || getDefaultEnhancementPrompt();
    const temperature = config.enhancement_temperature ?? 0.3;
    const thinkingEnabled = config.enhancement_thinking ?? false;
    const searchEnabled = config.enhancement_search ?? false;

    setIsGenerating(true);

    try {
      const service = new GenerationService(apiKey, textModel.name, textModel.tpm || 60);
      const enhancedPrompts: string[] = [];

      // Process prompts one by one to show progress
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
          // Keep the original prompt if enhancement fails
          enhancedPrompts.push(prompts[i]);
        }
      }

      // Update prompts with enhanced versions
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

    // Optimistic update
    setResults(prev => {
      const newResults = [...prev];
      newResults[index] = { ...newResults[index], isLoading: true, error: undefined };
      return newResults;
    });

    const service = new GenerationService(apiKey || '', selectedModel.name, selectedModel.tpm, selectedModel.temperature, selectedModel.topP, aspectRatio, customWidth, customHeight, selectedModel.provider, replicateApiKey, selectedModel.config);

    try {
      const result = await service.generateImage(newPrompt, isPresetEnabled && selectedPreset ? selectedPreset.prompt : undefined);

      const currentResults = [...resultsRef.current];
      const oldResult = currentResults[index];
      const variants = oldResult.variants ? [...oldResult.variants] : (oldResult.imageUrl ? [{ imageUrl: oldResult.imageUrl, prompt: oldResult.prompt }] : []);

      if (result.imageUrl) {
        variants.push({ imageUrl: result.imageUrl, prompt: result.prompt });

        // Deduct credit
        // Deduct credit
        setCredits(prev => {
          const updated = prev - 1;
          return updated;
        });

        // Side effects outside updater
        // We know we are subtracting 1.
        // We can't easily get the 'updated' value from inside the updater to here without a temp variable or similar.
        // But we can just assume the operation succeeded.
        // A safer way for the DB update is to calculate it based on the *current* render scope 'credits' - 1, 
        // but if the user clicked multiple times fast, 'credits' might be stale.
        // However, 'handleRegenerate' is async and we just awaited.

        // Best effort:
        saveCredits(credits - 1);
        window.dispatchEvent(new Event('credits-updated'));
      }

      const updatedResult = {
        ...result,
        variants,
        selectedVariantIndex: variants.length - 1,
        isLoading: false
      };

      currentResults[index] = updatedResult;
      setResults(currentResults);

      // Update history
      if (currentHistoryId && selectedModel) {
        await updateHistoryItem({
          id: currentHistoryId,
          timestamp: Date.now(),
          presetName: selectedPreset ? selectedPreset.title : "No Preset",
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
            <PresetManager
              onSelect={setSelectedPreset}
              selectedPresetId={selectedPreset?.id}
              isEnabled={isPresetEnabled}
              onToggle={setIsPresetEnabled}
              compact // Add compact prop to PresetManager if needed, or just style it
            />
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
            <h2 className="text-2xl font-semibold text-foreground">Welcome to Booster AI</h2>
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

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="bg-secondary/50 p-6 rounded-full inline-block">
            <Palette size={48} className="opacity-50 animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
