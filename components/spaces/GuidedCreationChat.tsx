"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, User, Sparkles } from "lucide-react";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

interface AnalysisContext {
    mood?: string;
    subject?: string;
    goal?: string;
}

interface GuidedCreationChatProps {
    onComplete: (context: AnalysisContext) => void;
}

export function GuidedCreationChat({ onComplete }: GuidedCreationChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: "assistant",
            content: "Hi! I'm your Creative Director. I'll help you define the perfect style for your Space. To start, tell me what you're trying to build? (e.g. \"A spooky coloring book for adults\" or \"Clean icons for an app\")"
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [context, setContext] = useState<AnalysisContext>({});
    const [confidence, setConfidence] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Auto-focus input when it's user's turn
    useEffect(() => {
        if (!isLoading) {
            // Small timeout to ensure DOM is ready
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput("");

        // Optimistic update
        const newMessages: ChatMessage[] = [...messages, { role: "user", content: userMsg }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const response = await fetch("/api/spaces/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: newMessages,
                    currentContext: context
                }),
            });

            if (!response.ok) throw new Error("Chat failed");

            const data = await response.json();

            // Update context if provided
            if (data.context) {
                setContext(data.context);
            }
            if (data.confidence) {
                setConfidence(data.confidence);
            }

            // Add assistant response
            if (data.message) {
                setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
            }

            // Check if ready
            if (data.ready) {
                // Short delay to let user read the final message before moving on
                setTimeout(() => {
                    onComplete(data.context);
                }, 1500);
            }

        } catch (error) {
            console.error("Chat error", error);
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I had a brain fart. Could you say that again?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-[600px] w-full max-w-4xl mx-auto border border-border rounded-xl bg-card overflow-hidden shadow-sm">
            {/* Sidebar: Live DNA */}
            <div className="w-1/3 bg-muted/20 border-r border-border p-6 space-y-6 hidden md:block">
                <div className="space-y-1">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Sparkles size={16} className="text-primary" />
                        Style DNA
                    </h3>
                    <p className="text-xs text-muted-foreground">AI Understanding</p>
                </div>

                {/* Confidence Meter */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                        <span>Confidence</span>
                        <span>{confidence}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-500 ease-out"
                            style={{ width: `${confidence}%` }}
                        />
                    </div>
                </div>

                {/* DNA Attributes */}
                <div className="space-y-4">
                    <div className={`p-3 rounded-lg border transition-all duration-300 ${context.mood ? 'bg-primary/10 border-primary/20' : 'bg-background border-border border-dashed'}`}>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Mood / Vibe</label>
                        <div className={`font-medium ${context.mood ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                            {context.mood || "Pending..."}
                        </div>
                    </div>

                    <div className={`p-3 rounded-lg border transition-all duration-300 ${context.subject ? 'bg-primary/10 border-primary/20' : 'bg-background border-border border-dashed'}`}>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject</label>
                        <div className={`font-medium ${context.subject ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                            {context.subject || "Pending..."}
                        </div>
                    </div>

                    <div className={`p-3 rounded-lg border transition-all duration-300 ${context.goal ? 'bg-primary/10 border-primary/20' : 'bg-background border-border border-dashed'}`}>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Creative Goal</label>
                        <div className={`text-sm ${context.goal ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                            {context.goal || "Pending..."}
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                <div className="bg-muted/30 p-4 border-b border-border flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full text-primary md:hidden">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold">Creative Director</h3>
                        <p className="text-xs text-muted-foreground">Helping you define your vision</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user"
                                    ? "bg-primary text-primary-foreground rounded-tr-none"
                                    : "bg-secondary/50 text-secondary-foreground rounded-tl-none"
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-secondary/20 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 items-center">
                                <span className="w-2 h-2 bg-foreground/20 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-foreground/20 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-foreground/20 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-background border-t border-border">
                    <div className="flex gap-2 relative">
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Type your reply..."
                            disabled={isLoading}
                            className="flex-1 bg-secondary/30 border border-input rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            autoFocus
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="p-2 bg-primary text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 transition-all absolute right-1 top-1/2 -translate-y-1/2"
                        >
                            <ArrowUp size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
