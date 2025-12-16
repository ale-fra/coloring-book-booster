"use client";

import { Suspense } from 'react';
import { GenerationPage } from '@/components/generation/GenerationPage';
import { Palette } from 'lucide-react';

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
      <GenerationPage />
    </Suspense>
  );
}
