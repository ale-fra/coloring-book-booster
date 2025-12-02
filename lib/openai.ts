interface ChatMessage {
    role: 'system' | 'user';
    content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

export interface ReferenceImageInput {
    dataUrl: string;
    name?: string;
    mimeType?: string;
}

export interface SpacePromptRequest {
    name: string;
    objective: string;
    theme?: string;
    constraints?: string;
    styleDefinition?: string;
    imageAnalyses: string[];
}

export class OpenAIConnector {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'gpt-4o-mini') {
        this.apiKey = apiKey;
        this.model = model;
    }

    private async chat(messages: ChatMessage[], temperature = 0.3): Promise<string> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                temperature,
                messages,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const content = choice?.message?.content;

        if (Array.isArray(content)) {
            return content.map((part: { text?: string }) => part?.text || '').join(' ').trim();
        }

        return (content as string | undefined)?.trim() || '';
    }

    async analyzeReference(reference: ReferenceImageInput): Promise<string> {
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content:
                    'Analizza questa immagine di riferimento e restituisci in 3-5 bullet sintetici: stile delle linee, palette o assenza di colori, complessità, composizione e elementi ricorrenti da mantenere o evitare.',
            },
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'Reference da analizzare e sintetizzare per lo Space.' },
                    { type: 'image_url', image_url: { url: reference.dataUrl } },
                ],
            },
        ];

        return this.chat(messages, 0.2);
    }

    async buildSpacePrompt(request: SpacePromptRequest): Promise<string> {
        const { name, objective, constraints, theme, styleDefinition, imageAnalyses } = request;
        const guidance = [
            `Space: ${name}`,
            `Obiettivo: ${objective}`,
            theme ? `Tema ricorrente: ${theme}` : null,
            constraints ? `Vincoli dichiarati: ${constraints}` : null,
            styleDefinition ? `Definizione utente dello stile: ${styleDefinition}` : null,
            imageAnalyses.length > 0
                ? `Analisi immagini di riferimento: ${imageAnalyses.map((item, idx) => `(${idx + 1}) ${item}`).join(' ')}`
                : null,
        ]
            .filter(Boolean)
            .join('\n');

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content:
                    'Sei un prompt engineer. Ricevi descrizioni e analisi di reference per costruire uno Space Prompt unico, conciso e completo. Il prompt deve essere riutilizzabile, descrivere tono, composizione, linee, complessità consentita, elementi da evitare, palette e formato di output. Restituisci solo il testo del prompt finale.',
            },
            {
                role: 'user',
                content: guidance,
            },
        ];

        return this.chat(messages, 0.25);
    }

    async standardizeRequest(spacePrompt: string, userRequest: string): Promise<string> {
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content:
                    'Prendi il seguente Space Prompt come regola fissa di stile. Ricevi una richiesta utente e trasformala in un prompt standardizzato, pulito e coerente che rispetti fedelmente lo Space. Includi correzioni e aggiustamenti necessari per mantenere composizione, livello di dettaglio e divieti stabiliti.',
            },
            {
                role: 'user',
                content: `SPACE PROMPT:\n${spacePrompt}\n\nRICHIESTA UTENTE:\n${userRequest}\n\nRestituisci solo il prompt finale standardizzato.`,
            },
        ];

        return this.chat(messages, 0.3);
    }
}
