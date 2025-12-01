"use client";

import { motion } from 'framer-motion';

interface GenerationProgressProps {
    total: number;
    completed: number;
    isGenerating: boolean;
}

export function GenerationProgress({ total, completed, isGenerating }: GenerationProgressProps) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (!isGenerating && completed === 0) return null;

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress</span>
                <span>{completed} / {total} ({percentage}%)</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>
            {isGenerating && (
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                    Generating images in parallel batches...
                </p>
            )}
        </div>
    );
}
