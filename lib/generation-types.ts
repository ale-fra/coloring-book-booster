export interface GenerationResult {
    prompt: string;
    imageUrl?: string; // Base64 data URI
    error?: string;
    isLoading?: boolean;
    variants?: { imageUrl: string, prompt: string }[];
    selectedVariantIndex?: number;
}
