"use client";

import { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowUp } from 'lucide-react';
import { cn } from '../lib/utils';

interface PromptInputProps {
    onPromptsLoaded: (prompts: string[]) => void;
    isLoading?: boolean;
}

export function PromptInput({ onPromptsLoaded, isLoading }: PromptInputProps) {
    const [textInput, setTextInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [textInput]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleTextParse();
        }
    };

    const handleTextParse = () => {
        if (!textInput.trim() || isLoading) return;

        const prompts = textInput
            .split(/\r?\n/)
            .map(p => p.trim())
            .filter(p => p.length > 0);

        if (prompts.length > 0) {
            onPromptsLoaded(prompts);
            setTextInput('');
            // Reset height
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto p-4">
            <div className="relative flex items-end gap-2 bg-secondary/50 border border-border rounded-xl p-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <textarea
                    ref={textareaRef}
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Paste prompts here, one per line..."
                    className="w-full bg-transparent border-none text-sm focus:ring-0 outline-none resize-none max-h-[200px] min-h-[24px] py-1"
                    rows={1}
                />
                <button
                    onClick={handleTextParse}
                    disabled={!textInput.trim() || isLoading}
                    className={cn(
                        "p-2 rounded-lg transition-all flex-shrink-0",
                        textInput.trim() && !isLoading
                            ? "bg-primary text-primary-foreground hover:opacity-90"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                >
                    {isLoading ? <Sparkles className="animate-spin" size={18} /> : <ArrowUp size={18} />}
                </button>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2">
                Booster AI can make mistakes. Check generated images.
            </p>
        </div>
    );
}
