import { NextResponse } from "next/server";
import { createTextConnector } from "@/lib/connectors/factory";
import { auth } from "@/auth";

const DIRECTOR_SYSTEM_PROMPT = `
You are a Creative Director for a visual AI tool.
Your goal is to help the user define a clear vision for a new "Style Space".
You need to extract three key pieces of information (The "Priors"):
1. **Mood/Vibe**: (e.g. "Spooky", "Corporate Clean", "Playful", "Dark & Gritty").
2. **Subject**: (e.g. "Robots", "Icons", "Coloring Book Pages", "UI Elements").
3. **Creative Goal/Audience**: (e.g. "For elderly people to relax", "For a tech startup's landing page", "To make funny stickers").

Stats:
- Context: {lastContext}
- Turn Count: {turnCount} / 3

Instructions:
1. Analyze the user's latest message.
2. Estimate a **Confidence Score** (0-100) based on how clearly defined the 3 Priors are.
   - 100% = All 3 are explicitly clearly defined.
   - 0% = Total gibberish.
3. **Smart Graduation**:
   - If Confidence > 90, set "ready": true. (Early Exit).
   - If Turn Count is 3, set "ready": true. (Forced Exit).
4. If not ready, ask a *short* clarifying question. Focus on the missing info.
5. **CRITICAL CONSTRAINT**: You have a MAXIMUM of 3 turns to get this info.
   - If Turn Count is 3, THIS IS THE LAST TURN. You MUST close.
6. Be friendly, casual, and encouraging. Like grabbing coffee.

**CRITICAL OUTPUT FORMAT**:
You must ALWAYS return a JSON object. NO markdown, NO conversational text outside the JSON.

Format:
{
  "message": "Your response to the user here...",
  "ready": boolean,
  "confidence": number, // 0-100
  "context": {
    "mood": "extracted mood or null",
    "subject": "extracted subject or null",
    "goal": "extracted goal or null"
  }
}
`;

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { messages, currentContext } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Messages array required" }, { status: 400 });
        }

        const userLastMessage = messages[messages.length - 1].content;

        // Calculate turn count (number of assistant responses + 1 for current turn)
        const assistantMsgs = messages.filter((m: any) => m.role === 'assistant').length;
        const turnCount = assistantMsgs + 1;

        // Prepare system prompt with current context state
        const systemPrompt = DIRECTOR_SYSTEM_PROMPT
            .replace("{lastContext}", JSON.stringify(currentContext || {}))
            .replace("{turnCount}", turnCount.toString());

        const connector = await createTextConnector();

        // We use a simple chat interface for now. 
        // Note: Ideally we'd pass full history, but our connector interface is simple (system + user msg).
        // To support history with the current simple interface, we can append history to the user message 
        // or refactor the connector. For now, we'll concatenate the last few turns if needed, 
        // but the "Context" variable in the system prompt helps maintain state.

        // Let's just send the latest user message + system. 
        // The LLM "State" is maintained by the client passing back 'currentContext' which we inject into the system prompt.
        // This is a stateless "State Machine" approach. Great for simple flows.

        const rawResponse = await connector.chat(systemPrompt, userLastMessage);

        // Attempt to parse JSON
        let parsedResponse;
        try {
            // Clean up potentially md blocks
            const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedResponse = JSON.parse(cleanJson);
        } catch (e) {
            // Fallback if LLM fails to JSON
            console.error("Failed to parse Director JSON", rawResponse);
            parsedResponse = {
                message: rawResponse, // Treat raw output as message
                ready: false,
                context: currentContext
            };
        }

        // FORCE completion if we hit the limit, regardless of what the LLM says
        if (turnCount >= 3) {
            console.log("Forcing chat completion due to turn limit.");
            parsedResponse.ready = true;

            // Ensure we have at least partial context to return
            if (!parsedResponse.context) {
                parsedResponse.context = currentContext || {};
            }
        }

        return NextResponse.json(parsedResponse);

    } catch (error: any) {
        console.error("Director Chat Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process chat" },
            { status: 500 }
        );
    }
}
