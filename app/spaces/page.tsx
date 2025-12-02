"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileText, Images, Layers, Plus, ShieldCheck, Sparkles, UploadCloud, Wand2 } from "lucide-react";

interface ReferencePreview {
  name?: string;
  mimeType?: string;
  dataUrl: string;
}

interface SpaceImage extends ReferencePreview {
  id: string;
  analysis?: string;
}

interface SpaceItem {
  id: string;
  name: string;
  objective: string;
  theme?: string;
  constraints?: string;
  styleDefinition?: string;
  prompt?: string;
  status?: string;
  images: SpaceImage[];
  createdAt?: string;
}

const creationSteps = [
  {
    title: "Setup guidato tramite chat",
    description: "Definisci il tipo di immagini, gli obiettivi estetici e i vincoli che il nuovo Space dovrà rispettare.",
    icon: Sparkles,
  },
  {
    title: "Upload immagini di riferimento",
    description: "Carica fino a 10 immagini che rappresentano lo stile da replicare per addestrare lo Space.",
    icon: UploadCloud,
  },
  {
    title: "Analisi automatica",
    description: "Il sistema estrapola caratteristiche formali, pattern ricorrenti, elementi da mantenere o evitare e la complessità delle composizioni.",
    icon: Layers,
  },
  {
    title: "Generazione dello Space Prompt",
    description: "Combina descrizione testuale, insight delle immagini e preferenze dichiarate in una guida di stile stabile.",
    icon: Wand2,
  },
];

const usageSteps = [
  {
    title: "Richiesta libera",
    description: "L'utente scrive cosa vuole ottenere senza preoccuparsi dei vincoli di stile.",
  },
  {
    title: "Recupero dello Space Prompt",
    description: "Il prompt codificato dello Space viene richiamato come regola fissa dello stile.",
  },
  {
    title: "Rielaborazione automatica",
    description: "L'AI fonde Space Prompt e richiesta grezza in un prompt standardizzato, correggendo errori e allineando tutto allo stile.",
  },
  {
    title: "Invio al generatore",
    description: "Solo il prompt standard pulito viene passato al modello generativo, garantendo coerenza e qualità.",
  },
];

const benefits = [
  "Coerenza visiva garantita nel tempo su ogni richiesta.",
  "Prompt sempre standardizzati e puliti anche con input disordinati.",
  "Filtri intelligenti che evitano errori e mantengono vincoli estetici.",
  "Controllo creativo scalabile per progetti editoriali, KDP e pattern books.",
];

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    objective: "",
    theme: "",
    constraints: "",
    styleDefinition: "",
  });
  const [references, setReferences] = useState<ReferencePreview[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [standardizedPrompts, setStandardizedPrompts] = useState<Record<string, { prompt: string; request: string; isLoading: boolean; error?: string }>>({});

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/spaces");
      const data = await response.json();
      setSpaces(data.spaces || []);
    } catch (err) {
      console.error(err);
      setError("Impossibile caricare gli Space. Verifica la connessione o riprova.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const limited = Array.from(files).slice(0, 10 - references.length);
    const newRefs: ReferencePreview[] = [];

    for (const file of limited) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Errore nella lettura del file"));
        reader.readAsDataURL(file);
      });
      newRefs.push({ dataUrl, mimeType: file.type, name: file.name });
    }

    setReferences((prev) => [...prev, ...newRefs]);
  };

  const removeReference = (index: number) => {
    setReferences((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateSpace = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, references }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Impossibile creare lo Space");
      }

      setSpaces((prev) => [data.space, ...prev]);
      setForm({ name: "", objective: "", theme: "", constraints: "", styleDefinition: "" });
      setReferences([]);
      setSuccessMessage("Space creato e Space Prompt generato con successo.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Errore nella creazione dello Space.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStandardize = async (spaceId: string, request: string) => {
    if (!request) {
      setStandardizedPrompts((prev) => ({
        ...prev,
        [spaceId]: { ...prev[spaceId], prompt: prev[spaceId]?.prompt || "", request: "", isLoading: false, error: "Inserisci una richiesta da standardizzare." },
      }));
      return;
    }

    setStandardizedPrompts((prev) => ({
      ...prev,
      [spaceId]: { ...prev[spaceId], isLoading: true, error: undefined, request },
    }));

    try {
      const response = await fetch(`/api/spaces/${spaceId}/standardize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRequest: request }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Impossibile standardizzare la richiesta");
      }

      setStandardizedPrompts((prev) => ({
        ...prev,
        [spaceId]: { prompt: data.prompt, request, isLoading: false },
      }));
    } catch (err: unknown) {
      setStandardizedPrompts((prev) => ({
        ...prev,
        [spaceId]: {
          prompt: prev[spaceId]?.prompt || "",
          request,
          isLoading: false,
          error: err instanceof Error ? err.message : "Errore nella standardizzazione del prompt",
        },
      }));
    }
  };

  const hasReferences = useMemo(() => references.length > 0, [references.length]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary" />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Nuova funzionalità</p>
            <h1 className="text-3xl font-bold tracking-tight">Spaces</h1>
          </div>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Uno Space è un contenitore di stile ultra-specifico: memorizza regole, immagini di riferimento e uno Space Prompt finale per garantire output coerenti e controllati.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold">Stile codificato</p>
              <p className="text-sm text-muted-foreground">Lo Space Prompt diventa la regola fissa che governa ogni generazione.</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
            <Images className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold">Fino a 10 reference</p>
              <p className="text-sm text-muted-foreground">Carica immagini per catturare texture, linee e composizione desiderate.</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
            <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold">Prompt sempre puliti</p>
              <p className="text-sm text-muted-foreground">Ogni richiesta viene filtrata e adattata al linguaggio standard dello Space.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Crea un nuovo Space</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Descrivi lo stile, allega reference e lascia che l’analisi automatica generi uno Space Prompt affidabile.
            </p>
            <form className="space-y-4" onSubmit={handleCreateSpace}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-sm font-medium">Nome</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Es. Line Art Botanica"
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium">Tema ricorrente (opzionale)</span>
                  <input
                    value={form.theme}
                    onChange={(e) => setForm((prev) => ({ ...prev, theme: e.target.value }))}
                    placeholder="Es. pattern floreali minimal"
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-sm font-medium">Obiettivo estetico</span>
                <textarea
                  required
                  value={form.objective}
                  onChange={(e) => setForm((prev) => ({ ...prev, objective: e.target.value }))}
                  placeholder="Es. linee spesse, fondi chiari, soggetti centrati, zero shading..."
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm min-h-[80px]"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-sm font-medium">Vincoli e cose da evitare (opzionale)</span>
                <textarea
                  value={form.constraints}
                  onChange={(e) => setForm((prev) => ({ ...prev, constraints: e.target.value }))}
                  placeholder="Es. evitare volti realistici, no sfondi affollati, preferire composizioni simmetriche"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm min-h-[60px]"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-sm font-medium">Definizione dello stile (opzionale)</span>
                <textarea
                  value={form.styleDefinition}
                  onChange={(e) => setForm((prev) => ({ ...prev, styleDefinition: e.target.value }))}
                  placeholder="Descrivi in breve il mood o altre note da incorporare nello Space Prompt."
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm min-h-[60px]"
                />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Reference (max 10)</p>
                  </div>
                  <label className="text-xs text-muted-foreground">PNG/JPG, convertite in base64 e salvate nel database</label>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                  className="block w-full text-sm"
                />
                {hasReferences && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {references.map((ref, index) => (
                      <div key={index} className="relative border border-border rounded-md overflow-hidden">
                        <img src={ref.dataUrl} alt={ref.name || `Reference ${index + 1}`} className="w-full h-24 object-cover" />
                        <button
                          type="button"
                          onClick={() => removeReference(index)}
                          className="absolute top-1 right-1 bg-background/80 rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          ×
                        </button>
                        <div className="p-2 text-xs text-muted-foreground truncate">{ref.name || `Reference ${index + 1}`}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center justify-center gap-2 font-medium hover:opacity-90 disabled:opacity-60"
              >
                {isSaving ? "Analisi in corso..." : "Crea Space e genera Space Prompt"}
              </button>
            </form>
          </div>
        </section>

        <section className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Come funziona</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Lo Space Prompt viene costruito sommando la tua descrizione, l’analisi delle reference tramite OpenAI e i vincoli opzionali. Ogni nuova richiesta viene poi normalizzata su questo stile.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><ArrowRight className="h-4 w-4 text-primary mt-1" />Carica fino a 10 immagini: vengono salvate in base64 insieme al riassunto automatico.</li>
              <li className="flex gap-2"><ArrowRight className="h-4 w-4 text-primary mt-1" />OpenAI elabora sia testo che immagini per produrre un unico Space Prompt.</li>
              <li className="flex gap-2"><ArrowRight className="h-4 w-4 text-primary mt-1" />Ogni richiesta futura viene standardizzata e ripulita prima di passare al generatore.</li>
            </ul>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Stato</h3>
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Caricamento degli Space in corso...</p>
            ) : spaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuno Space ancora creato.</p>
            ) : (
              <p className="text-sm text-muted-foreground">{spaces.length} Space salvati in database.</p>
            )}
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold">Utilizzo corretto dello Space</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {usageSteps.map((step, index) => (
            <div key={step.title} className="bg-card border border-border rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-sm text-primary font-semibold">
                <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">{index + 1}</span>
                {step.title}
              </div>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold">Space salvati</h2>
        </div>

        {spaces.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-5 text-sm text-muted-foreground">
            Nessuno Space presente. Creane uno per iniziare a standardizzare i prompt.
          </div>
        ) : (
          <div className="space-y-4">
            {spaces.map((space) => {
              const standardized = standardizedPrompts[space.id];
              return (
                <div key={space.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Space Prompt</p>
                      <h3 className="text-xl font-semibold">{space.name}</h3>
                      <p className="text-sm text-muted-foreground">{space.objective}</p>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full self-start">{space.status || "ready"}</span>
                  </div>

                  {space.prompt ? (
                    <div className="bg-muted/40 border border-border rounded-md p-3 text-sm whitespace-pre-wrap">{space.prompt}</div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nessun Space Prompt disponibile.</p>
                  )}

                  {space.images.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Reference analizzate</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {space.images.map((img) => (
                          <div key={img.id} className="border border-border rounded-md overflow-hidden">
                            <img src={img.dataUrl} alt={img.name || "Reference"} className="w-full h-24 object-cover" />
                            <div className="p-2 text-xs text-muted-foreground space-y-1">
                              <p className="font-medium text-foreground truncate">{img.name || "Reference"}</p>
                              {img.analysis && <p className="line-clamp-3">{img.analysis}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Standardizza una richiesta</p>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                      <input
                        type="text"
                        value={standardized?.request ?? ""}
                        onChange={(e) =>
                          setStandardizedPrompts((prev) => ({
                            ...prev,
                            [space.id]: { ...prev[space.id], request: e.target.value, prompt: prev[space.id]?.prompt || "", isLoading: false },
                          }))
                        }
                        placeholder="Es. Un unicorno che salta su una nuvola"
                        className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => handleStandardize(space.id, standardized?.request || "")}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
                        disabled={standardized?.isLoading}
                      >
                        {standardized?.isLoading ? "Elaboro..." : "Genera prompt"}
                      </button>
                    </div>
                    {standardized?.error && <p className="text-sm text-destructive">{standardized.error}</p>}
                    {standardized?.prompt && (
                      <div className="bg-muted/40 border border-border rounded-md p-3 text-sm whitespace-pre-wrap">
                        {standardized.prompt}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold">Vantaggi</h2>
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

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold">Flusso di creazione</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {creationSteps.map((step) => (
            <div key={step.title} className="bg-card border border-border rounded-xl p-5 flex gap-3">
              <div className="mt-1">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
