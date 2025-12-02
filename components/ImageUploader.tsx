"use client";

import { UploadCloud, X } from "lucide-react";
import { useCallback, useState } from "react";

interface ImageUploaderProps {
    onImagesChange: (images: { dataUrl: string; mimeType: string; name: string }[]) => void;
    maxImages?: number;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
}

export function ImageUploader({
    onImagesChange,
    maxImages = 10,
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8,
}: ImageUploaderProps) {
    const [images, setImages] = useState<{ dataUrl: string; mimeType: string; name: string }[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const processImage = useCallback(
        (file: File): Promise<{ dataUrl: string; mimeType: string; name: string }> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > maxWidth) {
                                height = Math.round((height * maxWidth) / width);
                                width = maxWidth;
                            }
                        } else {
                            if (height > maxHeight) {
                                width = Math.round((width * maxHeight) / height);
                                height = maxHeight;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext("2d");
                        if (!ctx) {
                            reject(new Error("Could not get canvas context"));
                            return;
                        }

                        ctx.drawImage(img, 0, 0, width, height);
                        const dataUrl = canvas.toDataURL(file.type, quality);
                        resolve({ dataUrl, mimeType: file.type, name: file.name });
                    };
                    img.onerror = () => reject(new Error("Failed to load image"));
                    img.src = e.target?.result as string;
                };
                reader.onerror = () => reject(new Error("Failed to read file"));
                reader.readAsDataURL(file);
            });
        },
        [maxWidth, maxHeight, quality]
    );

    const handleFiles = async (files: FileList | null) => {
        if (!files) return;
        setIsProcessing(true);

        try {
            const remainingSlots = maxImages - images.length;
            const filesToProcess = Array.from(files).slice(0, remainingSlots);

            const processedImages = await Promise.all(filesToProcess.map(processImage));

            const newImages = [...images, ...processedImages];
            setImages(newImages);
            onImagesChange(newImages);
        } catch (error) {
            console.error("Error processing images:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const removeImage = (index: number) => {
        const newImages = images.filter((_, i) => i !== index);
        setImages(newImages);
        onImagesChange(newImages);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Reference Images ({images.length}/{maxImages})</label>
                <span className="text-xs text-muted-foreground">Images are resized to max {maxWidth}px</span>
            </div>

            {/* Single Drop Zone / Upload Button */}
            <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    } ${isProcessing || images.length >= maxImages ? "opacity-50 cursor-not-allowed" : ""}`}
            >
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isProcessing || images.length >= maxImages}
                    onChange={(e) => handleFiles(e.target.files)}
                    className="hidden"
                />
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <UploadCloud className="h-8 w-8" />
                    <p className="text-sm font-medium">
                        {isProcessing
                            ? "Processing..."
                            : images.length >= maxImages
                                ? "Limit reached"
                                : "Click to upload or drag and drop"}
                    </p>
                </div>
            </label>

            {/* Grid of Images and Placeholders */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Render existing images */}
                {images.map((img, index) => (
                    <div key={index} className="relative aspect-square border border-border rounded-lg overflow-hidden group bg-background">
                        <img
                            src={img.dataUrl}
                            alt={img.name}
                            className="w-full h-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-background/80 rounded-full p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}

                {/* Render visual placeholders for remaining slots */}
                {Array.from({ length: Math.max(0, maxImages - images.length) }).map((_, index) => (
                    <div
                        key={`placeholder-${index}`}
                        className="relative aspect-square border border-border bg-muted/20 rounded-lg flex items-center justify-center"
                    >
                        <div className="text-muted-foreground/20">
                            <UploadCloud className="h-8 w-8" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
