
import 'dotenv/config'; // Load env vars
import { createTextConnector } from '../lib/connectors/factory';

async function main() {
    console.log("Starting Standardization Verification...");

    try {
        // Use Gemini by default as it is likely configured.
        const connector = await createTextConnector('gemini');

        const mockSpacePrompt = "Style: Vector line art. Constraints: No shading, black and white only.";
        const mockUserInput = "A cute robot with shiny metallic reflections.";

        console.log("Mock Space Prompt:", mockSpacePrompt);
        console.log("Mock User Input:", mockUserInput);
        console.log("Running standardizeRequest...");

        const result = await connector.standardizeRequest(mockSpacePrompt, mockUserInput);

        console.log("\n---------------------------------------------------");
        console.log("STANDARDIZATION RESULT:");
        console.log(result);
        console.log("---------------------------------------------------\n");

        if (result.toLowerCase().includes("metallic") || result.toLowerCase().includes("shiny")) {
            console.warn("WARNING: Result still contains 'metallic' or 'shiny'. Verification FAILED?");
        } else {
            console.log("SUCCESS: 'metallic' and 'shiny' seem to be removed.");
        }

    } catch (error) {
        console.error("Verification Error:", error);
    }
}

main();
