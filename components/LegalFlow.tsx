import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateLegalFlowchart } from '../services/geminiService';
import { SendIcon, LoaderIcon, GlobeIcon, ChevronDownIcon } from './Icons';

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'mr', label: 'मराठी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'ur', label: 'اردو' },
];

const EXAMPLES = [
  { label: '📋 How to File an FIR', query: 'How to file an FIR at a police station in India' },
  { label: '⚖️ File a Consumer Complaint', query: 'How to file a consumer complaint in India under Consumer Protection Act' },
  { label: '🏠 Tenant Eviction Process', query: 'Legal process for tenant eviction in India' },
  { label: '💼 File for Bail', query: 'How to apply for bail in India - regular and anticipatory' },
  { label: '👩‍⚖️ Domestic Violence Complaint', query: 'How to file a domestic violence complaint under DV Act 2005' },
  { label: '🚗 Road Accident Claim', query: 'How to file a motor accident claim in India at MACT' },
];

// ── Mermaid Renderer ───────────────────────────────────────────────
const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#1e3a4a',
            primaryTextColor: '#e8e8e8',
            primaryBorderColor: '#20b8cd',
            lineColor: '#20b8cd',
            secondaryColor: '#2b2d2d',
            tertiaryColor: '#313333',
            fontFamily: 'FK Grotesk, system-ui, sans-serif',
            fontSize: '13px',
            nodeBorder: '#20b8cd',
            mainBkg: '#1e3a4a',
            clusterBkg: '#202222',
            titleColor: '#e8e8e8',
            edgeLabelBackground: '#202222',
          },
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
            padding: 12,
            nodeSpacing: 30,
            rankSpacing: 40,
          },
        });

        const id = `mermaid-${Date.now()}`;
        const { svg: rendered } = await mermaid.render(id, chart);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Mermaid render error:', err);
          setError(err.message || 'Failed to render diagram');
        }
      }
    };

    if (chart.trim()) render();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div className="space-y-3">
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          Diagram rendering error. Showing raw flowchart code:
        </div>
        <pre className="px-4 py-3 bg-bg-tertiary rounded-lg border border-border text-xs text-text-secondary overflow-x-auto whitespace-pre-wrap font-mono">
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderIcon className="w-5 h-5 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto py-2 flex justify-center [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

// ── Main Component ─────────────────────────────────────────────────
export const LegalFlow: React.FC = () => {
  const [input, setInput] = useState('');
  const [mermaidCode, setMermaidCode] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'diagram' | 'steps'>('diagram');

  const langMenuRef = useRef<HTMLDivElement>(null);

  const handleGenerate = useCallback(async (queryOverride?: string) => {
    const query = queryOverride || input.trim();
    if (!query || isLoading) return;
    if (queryOverride) setInput(queryOverride);

    setMermaidCode('');
    setExplanation('');
    setIsLoading(true);
    setActiveTab('diagram');

    try {
      const result = await generateLegalFlowchart(query, language);
      setMermaidCode(result.mermaid);
      setExplanation(result.explanation);
    } catch (err) {
      setExplanation('❌ Failed to generate flowchart. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, language]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const selectedLang = LANGUAGE_OPTIONS.find((l) => l.code === language) || LANGUAGE_OPTIONS[0];

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-500/15 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🗺️</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary tracking-tight">Legal-Flow</h1>
              <p className="text-sm text-text-secondary">Visual step-by-step legal roadmaps</p>
            </div>
          </div>

          {/* Language */}
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 px-3 py-2 bg-bg-secondary border border-border rounded-lg text-xs text-text-secondary hover:text-text-primary hover:border-border-light transition-colors"
            >
              <GlobeIcon className="w-3.5 h-3.5" />
              <span>{selectedLang.label}</span>
              <ChevronDownIcon className="w-3 h-3" />
            </button>
            {showLangMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-bg-secondary border border-border rounded-lg shadow-xl z-20 py-1 max-h-56 overflow-y-auto">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setShowLangMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      language === lang.code
                        ? 'text-accent bg-accent/10'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <section className="bg-bg-secondary rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <FlowIcon className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Describe the legal process you want to visualize</h2>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='e.g. "How to file an FIR" or "Bail application process"'
              className="flex-1 px-4 py-2.5 bg-bg-tertiary text-text-primary text-sm rounded-lg border border-border focus:border-accent focus:outline-none placeholder:text-text-quaternary transition-colors"
            />
            <button
              onClick={() => handleGenerate()}
              disabled={!input.trim() || isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-bg rounded-lg text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isLoading ? (
                <LoaderIcon className="w-4 h-4 animate-spin" />
              ) : (
                <SendIcon className="w-4 h-4" />
              )}
              {isLoading ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </section>

        {/* Examples (when idle) */}
        {!mermaidCode && !isLoading && (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-1">Try an example</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => handleGenerate(ex.query)}
                  className="text-left px-4 py-3 bg-bg-secondary rounded-xl border border-border hover:border-border-light hover:bg-bg-tertiary transition-all group"
                >
                  <span className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">{ex.label}</span>
                  <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{ex.query}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <section className="bg-bg-secondary rounded-xl border border-border p-8 animate-pulse">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 bg-bg-tertiary rounded-2xl flex items-center justify-center">
                <LoaderIcon className="w-6 h-6 text-accent animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary">Generating your legal flowchart…</p>
                <p className="text-xs text-text-quaternary mt-1">AI is mapping the steps, laws & timelines</p>
              </div>
              <div className="w-full max-w-sm space-y-2 mt-4">
                <div className="h-2 bg-bg-tertiary rounded-full w-full" />
                <div className="h-2 bg-bg-tertiary rounded-full w-3/4 mx-auto" />
                <div className="h-2 bg-bg-tertiary rounded-full w-1/2 mx-auto" />
              </div>
            </div>
          </section>
        )}

        {/* Result with tabs */}
        {mermaidCode && !isLoading && (
          <section className="bg-bg-secondary rounded-xl border border-border overflow-hidden animate-slide-up">
            {/* Tab bar */}
            <div className="px-5 py-2 border-b border-border flex items-center gap-1">
              {(['diagram', 'steps'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === tab
                      ? 'bg-accent/15 text-accent'
                      : 'text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary'
                  }`}
                >
                  {tab === 'diagram' ? '🗺️ Flowchart' : '📝 Step-by-Step'}
                </button>
              ))}
            </div>

            {/* Diagram tab */}
            {activeTab === 'diagram' && (
              <div className="p-5">
                <MermaidDiagram chart={mermaidCode} />
              </div>
            )}

            {/* Steps tab */}
            {activeTab === 'steps' && explanation && (
              <div className="p-5 max-h-[60vh] overflow-y-auto">
                <div className="prose prose-invert prose-sm max-w-none
                  prose-headings:text-text-primary prose-headings:font-semibold prose-headings:tracking-tight
                  prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
                  prose-p:text-text-secondary prose-p:leading-relaxed
                  prose-strong:text-text-primary prose-strong:font-semibold
                  prose-li:text-text-secondary prose-li:leading-relaxed
                  prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                  prose-code:text-accent prose-code:bg-bg-tertiary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                ">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{explanation}</ReactMarkdown>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Disclaimer */}
        <div className="px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400/80 leading-relaxed">
          <strong>Disclaimer:</strong> Legal-Flow generates AI-based visual roadmaps for educational purposes. Actual processes may vary by state, jurisdiction, and case specifics. Consult a qualified advocate before taking legal action.
        </div>
      </div>
    </div>
  );
};

// ── Local icon ─────────────────────────────────────────────────────
const FlowIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="8" height="4" x="8" y="2" rx="1"/>
    <path d="M12 6v4"/>
    <path d="M12 10l-6 6"/>
    <path d="M12 10l6 6"/>
    <rect width="6" height="4" x="2" y="16" rx="1"/>
    <rect width="6" height="4" x="16" y="16" rx="1"/>
  </svg>
);
