import { NextResponse } from "next/server";
import { createVisionConnector } from "@/lib/connectors/factory";
import { ReferenceImageInput } from "@/lib/connectors/interfaces";
import { auth } from "@/auth";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, references } = body;

        if (!name || !references || !Array.isArray(references) || references.length === 0) {
            return NextResponse.json(
                { error: "Name and at least one reference image are required." },
                { status: 400 }
            );
        }

        const connector = await createVisionConnector();

        const refs = references as ReferenceImageInput[];
        const analyses = await Promise.all(
            refs.slice(0, 3).map(async (ref) => {
                return connector.analyzeReference(ref);
            })
        );

        const synthesis = await connector.synthesizeSpaceParams(name, analyses);

        return NextResponse.json(synthesis);

    } catch (error: unknown) {
        const err = error as Error;
        console.error("!!! CRITICAL ERROR analyzing space !!!");
        console.error("Error Name:", err.name);
        console.error("Error Message:", err.message);
        console.error("Error Stack:", err.stack);
        return NextResponse.json(
            { error: err.message || "Failed to analyze space" },
            { status: 500 }
        );
    }
}

