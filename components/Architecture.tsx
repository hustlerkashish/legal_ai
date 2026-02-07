import React from 'react';
import { NetworkIcon, BrainIcon, ScaleIcon, ShieldIcon } from './Icons';

export const Architecture = () => {
    const layers = [
        {
            title: "Ingestion Layer",
            desc: "Raw legal texts (IPC, Constitution, Case Laws) and user documents are ingested, cleaned, and processed.",
            color: "bg-bg-elevated",
            textColor: "text-text-primary",
            borderColor: "border-border-light",
        },
        {
            title: "Reasoning Core",
            desc: "Gemini 2.5 Flash performs semantic analysis, context management, and adaptive complexity simplification.",
            color: "bg-accent/10",
            textColor: "text-text-primary",
            borderColor: "border-accent/20",
        },
        {
            title: "Presentation Layer",
            desc: "React + Tailwind UI renders structured responses with citations, disclaimers, and complexity toggles.",
            color: "bg-bg-secondary",
            textColor: "text-text-primary",
            borderColor: "border-border",
        }
    ];

    return (
        <div className="h-full overflow-y-auto bg-bg">
            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-10">
                    <h2 className="text-2xl font-bold text-text-primary mb-1">System Architecture</h2>
                    <p className="text-sm text-text-tertiary">How Legal AI processes and delivers legal intelligence.</p>
                </div>

                {/* Pipeline Layers */}
                <div className="space-y-3 mb-12">
                    {layers.map((layer, i) => (
                        <div key={i} className={`${layer.color} ${layer.textColor} p-5 rounded-xl flex items-start gap-4 border ${layer.borderColor} animate-slide-up`} style={{animationDelay: `${i * 0.1}s`}}>
                            <div className="w-8 h-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">
                                {i + 1}
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm mb-1">{layer.title}</h3>
                                <p className="text-sm text-text-secondary leading-relaxed">{layer.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Flow Diagram */}
                <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden mb-10">
                    <div className="px-5 py-3.5 border-b border-border">
                        <span className="text-sm font-medium text-text-secondary">Data Flow</span>
                    </div>
                    <div className="p-6 font-mono text-xs text-text-tertiary overflow-x-auto bg-bg">
                        <pre className="leading-relaxed">{`
    User / Citizen
        │
        ├── Natural Language Query ──► Chat Interface
        │                                    │
        └── Upload Legal Document ──► Doc Analyzer
                                             │
                                    ┌────────┴────────┐
                                    │  Gemini Service  │
                                    │                  │
                                    │  ┌────────────┐  │
                                    │  │  System     │  │
                                    │  │  Prompt     │  │
                                    │  │  (Lawyer)   │  │
                                    │  └──────┬─────┘  │
                                    │         │        │
                                    │  ┌──────▼─────┐  │
                                    │  │  Gemini    │  │
                                    │  │  2.5 Flash │  │
                                    │  └──────┬─────┘  │
                                    │         │        │
                                    │  Safety Filters  │
                                    └────────┬────────┘
                                             │
                                    Streaming Response
                                             │
                                    Formatted Markdown
                                             │
                                         User
                        `}</pre>
                    </div>
                </div>

                {/* Implementation Details */}
                <div className="bg-bg-secondary border border-border rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-text-primary mb-4">Implementation Details</h3>
                    <div className="space-y-3">
                        {[
                            { label: "RAG Simulation", desc: "Context window is primed with Indian Law personas and instructions to simulate retrieval-augmented generation." },
                            { label: "Vector Database", desc: "In production, Pinecone/Weaviate would store IPC/CrPC chunks. Currently uses Gemini's internal knowledge base." },
                            { label: "Security", desc: "API keys are environmental. No user data is persisted server-side in this demo." }
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                                <div className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <span className="text-sm font-medium text-text-primary">{item.label}: </span>
                                    <span className="text-sm text-text-secondary">{item.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
