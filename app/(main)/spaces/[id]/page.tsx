import { Suspense } from 'react';
import { GenerationPage } from '@/components/generation/GenerationPage';
import { db } from '@/lib/db/drizzle';
import { spaces } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Palette } from 'lucide-react';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function SpaceGenerationPage({ params }: PageProps) {
    const { id } = await params;

    const space = await db.query.spaces.findFirst({
        where: eq(spaces.id, id),
    });

    if (!space) {
        notFound();
    }

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen bg-background">
                <div className="text-center space-y-4">
                    <div className="bg-secondary/50 p-6 rounded-full inline-block">
                        <Palette size={48} className="opacity-50 animate-pulse" />
                    </div>
                    <p className="text-muted-foreground">Loading Space...</p>
                </div>
            </div>
        }>
            <GenerationPage
                spaceId={space.id}
                spaceName={space.name}
                spacePrompt={space.prompt || undefined}
            />
        </Suspense>
    );
}
