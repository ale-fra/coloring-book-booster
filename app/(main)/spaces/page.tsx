"use client";

import { useState } from "react";
import useSWR from "swr";
import { ArrowRight, Images, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { CreateSpaceWizard } from "@/components/spaces/CreateSpaceWizard";
import { SpaceCard, SpaceItem } from "@/components/spaces/SpaceCard";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const benefits = [
  "Guaranteed visual consistency over time.",
  "Standardized prompts even with messy inputs.",
  "Smart filters that avoid errors and maintain aesthetic constraints.",
  "Scalable creative control for editorial projects.",
];

export default function SpacesPage() {
  const { data, error, isLoading } = useSWR("/api/spaces", fetcher);
  const spaces: SpaceItem[] = data?.spaces || [];
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  if (isWizardOpen) {
    return (
      <div className="p-8 w-full max-w-[95vw] mx-auto">
        <CreateSpaceWizard
          onCancel={() => setIsWizardOpen(false)}
          onSuccess={() => setIsWizardOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">New Feature</p>
              <h1 className="text-3xl font-bold tracking-tight">Your Styles (Spaces)</h1>
            </div>
          </div>
          {spaces.length > 0 && (
            <button
              onClick={() => setIsWizardOpen(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 font-medium hover:opacity-90"
            >
              <Plus className="h-5 w-5" /> Create New Space
            </button>
          )}
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Create your personal creative assistant. Teach AI your preferred style and use it to create consistent images without repeating instructions every time.
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold">Saved Spaces</h2>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading Spaces...</p>
        ) : error ? (
          <p className="text-sm text-destructive">Error loading Spaces.</p>
        ) : spaces.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">No Spaces yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Create your first Space to start standardizing your image generation style.
              </p>
            </div>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 font-medium hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Create Space
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {spaces.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4 pt-8 border-t border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold">Benefits</h2>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 text-primary mt-1" />
              <p className="text-sm text-muted-foreground">{benefit}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
