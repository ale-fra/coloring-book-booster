import 'server-only';

export async function resolveOpenAIApiKey() {
    return process.env.OPENAI_API_KEY ?? null;
}
