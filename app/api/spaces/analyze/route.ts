import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 12000));

        return NextResponse.json({
            objective: "The style is characterized by clean lines, high contrast, and a focus on botanical subjects. It avoids shading and relies on line weight to define form.",
            constraints: "Avoid realistic shading, complex backgrounds, and human figures. Keep the composition centered and balanced.",
            styleDefinition: "Botanical Line Art with a focus on clarity and simplicity.",
        });
    } catch (error) {
        console.error("Error analyzing space:", error);
        return NextResponse.json(
            { error: "Failed to analyze space" },
            { status: 500 }
        );
    }
}
