import React from 'react';
import { ScaleIcon, UserIcon } from './Icons';

const TEAM_NAME = 'CodeX';
const TEAM_MEMBERS = [
  { name: 'Kashish Gandhi' },
  { name: 'Harmit Jetani' },
];

const TECH_STACK = [
  { category: 'Frontend', items: ['React 19', 'TypeScript', 'Vite', 'Tailwind CSS'] },
  { category: 'AI', items: ['Google Gemini API'] },
  { category: 'Auth', items: ['Firebase (Email/Password, Google)'] },
  { category: 'Content', items: ['React Markdown', 'Mermaid', 'React Router'] },
];

export const Architecture = () => {
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full box-border">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-1">About</h1>
          <p className="text-xs sm:text-sm text-text-tertiary">The team and tech behind Legal AI.</p>
        </div>

        {/* Team Section */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <ScaleIcon className="w-4 h-4" />
            </span>
            Team
          </h2>
          <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden">
            {/* Team photo placeholder – replace src with /team.jpg when you have a photo */}
            <div className="aspect-[4/3] sm:aspect-[2/1] bg-bg-tertiary border-b border-border flex items-center justify-center">
              <div className="text-center">
                     

                
              </div>
              {/* Optional: use a real image when available
              <img src="/team.jpg" alt="CodeX Team" className="w-full h-full object-cover" />
              */}
              <img src="/codeX.jpg" alt="CodeX Team" className="w-full h-full object-cover" />
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-sm font-semibold text-text-primary mb-3">{TEAM_NAME}</p>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {TEAM_MEMBERS.map((member, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-bg border border-border rounded-xl text-text-primary"
                  >
                    <UserIcon className="w-4 h-4 text-accent flex-shrink-0" />
                    <span className="text-sm font-medium">{member.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Tech Stack</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {TECH_STACK.map((group, i) => (
              <div
                key={i}
                className="bg-bg-secondary border border-border rounded-xl p-4 animate-slide-up"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <h3 className="text-xs font-semibold text-accent uppercase tracking-wider mb-3">
                  {group.category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((tech, j) => (
                    <span
                      key={j}
                      className="px-3 py-1.5 bg-bg border border-border rounded-lg text-sm text-text-primary"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project Flow */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-text-primary mb-4">How Legal AI Works</h2>
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <span className="text-sm font-medium text-text-secondary">Data Flow</span>
            </div>
            <div className="p-4 sm:p-6 font-mono text-[10px] sm:text-xs text-text-tertiary overflow-x-auto bg-bg">
              <pre className="leading-relaxed min-w-[320px]">{`
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
        </div>

        {/* Implementation Details */}
        <div className="bg-bg-secondary border border-border rounded-xl p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Implementation Notes</h3>
          <div className="space-y-3">
            {[
              {
                label: 'RAG Simulation',
                desc: "Context is primed with Indian Law personas to simulate retrieval-augmented generation.",
              },
              {
                label: 'Security',
                desc: 'API keys are in environment variables. Firebase handles auth; no user data stored server-side in this demo.',
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
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
