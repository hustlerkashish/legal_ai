import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateCaseStudy } from '../services/geminiService';
import { SendIcon, LoaderIcon, StopCircleIcon, GlobeIcon, ChevronDownIcon } from './Icons';

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

const LANDMARK_CASES = [
  { label: '⚖️ Kesavananda Bharati', query: 'Kesavananda Bharati v. State of Kerala - Basic Structure Doctrine' },
  { label: '🗳️ S.R. Bommai Case', query: 'S.R. Bommai v. Union of India - Federalism and President\'s Rule' },
  { label: '👤 Maneka Gandhi', query: 'Maneka Gandhi v. Union of India - Right to Life and Personal Liberty' },
  { label: '🏛️ Vishaka Guidelines', query: 'Vishaka v. State of Rajasthan - Sexual Harassment at Workplace' },
  { label: '🌍 MC Mehta Case', query: 'MC Mehta v. Union of India - Environmental Protection and Absolute Liability' },
  { label: '📜 Navtej Singh Johar', query: 'Navtej Singh Johar v. Union of India - Section 377 Decriminalization' },
  { label: '🏥 Aruna Shanbaug', query: 'Aruna Ramchandra Shanbaug v. Union of India - Right to Die and Passive Euthanasia' },
  { label: '🔒 K.S. Puttaswamy', query: 'K.S. Puttaswamy v. Union of India - Right to Privacy as Fundamental Right' },
];

// ── Mermaid Renderer (inline) ──────────────────────────────────────
const MermaidBlock: React.FC<{ code: string }> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(false);

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
          },
          flowchart: { htmlLabels: true, curve: 'basis', padding: 12 },
        });
        const id = `case-mermaid-${Date.now()}`;
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled) { setSvg(rendered); setError(false); }
      } catch {
        if (!cancelled) setError(true);
      }
    };
    if (code.trim()) render();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <pre className="px-4 py-3 bg-bg-tertiary rounded-lg border border-border text-xs text-text-secondary overflow-x-auto whitespace-pre-wrap font-mono">
        {code}
      </pre>
    );
  }
  if (!svg) {
    return (
      <div className="flex items-center justify-center py-8">
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

// ── Custom Markdown renderer that intercepts mermaid code blocks ───
const MarkdownWithMermaid: React.FC<{ content: string }> = ({ content }) => {
  // Split content on mermaid code fences and render them as diagrams
  const parts = content.split(/(```mermaid[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, i) => {
        const mermaidMatch = part.match(/^```mermaid\s*\n([\s\S]*?)\n?\s*```$/);
        if (mermaidMatch) {
          return (
            <div key={i} className="my-4 bg-bg rounded-xl border border-border p-4 overflow-hidden">
              <p className="text-[11px] text-text-quaternary uppercase tracking-wider font-semibold mb-3">🗺️ Case Flow Diagram</p>
              <MermaidBlock code={mermaidMatch[1].trim()} />
            </div>
          );
        }
        if (!part.trim()) return null;
        return (
          <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>
            {part}
          </ReactMarkdown>
        );
      })}
    </>
  );
};

// ── Main Component ─────────────────────────────────────────────────
export const CaseStudies: React.FC = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'text' | 'story'>('text');

  const abortControllerRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(async (queryOverride?: string) => {
    const query = queryOverride || input.trim();
    if (!query || isLoading) return;
    if (queryOverride) setInput(queryOverride);

    setResult('');
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      await generateCaseStudy(
        query,
        language,
        (chunk) => {
          setResult((prev) => prev + chunk);
          requestAnimationFrame(() => {
            if (resultRef.current) resultRef.current.scrollTop = resultRef.current.scrollHeight;
          });
        },
        abortControllerRef.current.signal
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const msg = err.message?.includes('Rate limit') || err.message?.includes('429')
          ? '\n\n⏳ **Rate Limit Reached** — The free Gemini API has a request quota. Please wait ~1 minute and try again.'
          : '\n\n❌ An error occurred. Please try again.';
        setResult((prev) => prev + msg);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, isLoading, language]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const selectedLang = LANGUAGE_OPTIONS.find((l) => l.code === language) || LANGUAGE_OPTIONS[0];

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-indigo-500/15 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary tracking-tight">Case Studies</h1>
              <p className="text-sm text-text-secondary">Search any Indian case — get full breakdown with visuals</p>
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

        {/* Search Input */}
        <section className="bg-bg-secondary rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <SearchIcon className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Search a case study</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='e.g. "Kesavananda Bharati" or "Right to Privacy case" or "Section 377 judgment"'
              className="flex-1 px-4 py-2.5 bg-bg-tertiary text-text-primary text-sm rounded-lg border border-border focus:border-accent focus:outline-none placeholder:text-text-quaternary transition-colors"
            />
            <div className="flex gap-2 flex-shrink-0">
              {isLoading ? (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-all"
                >
                  <StopCircleIcon className="w-4 h-4" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => handleSearch()}
                  disabled={!input.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-bg rounded-lg text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <SendIcon className="w-4 h-4" />
                  Search
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-text-quaternary">Search by case name, legal topic, section number, or describe the issue</p>
        </section>

        {/* Landmark Cases (idle state) */}
        {!result && !isLoading && (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-1">Landmark Cases</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {LANDMARK_CASES.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleSearch(c.query)}
                  className="text-left px-4 py-3 bg-bg-secondary rounded-xl border border-border hover:border-border-light hover:bg-bg-tertiary transition-all group"
                >
                  <span className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">{c.label}</span>
                  <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{c.query}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Loading */}
        {isLoading && !result && (
          <section className="bg-bg-secondary rounded-xl border border-border p-8 animate-pulse">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 bg-bg-tertiary rounded-2xl flex items-center justify-center">
                <LoaderIcon className="w-6 h-6 text-accent animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary">Researching case study…</p>
                <p className="text-xs text-text-quaternary mt-1">Analyzing facts, arguments, judgment & precedents</p>
              </div>
            </div>
          </section>
        )}

        {/* Result */}
        {(result || (isLoading && result)) && (
          <section className="bg-bg-secondary rounded-xl border border-border overflow-hidden animate-slide-up">
            {/* Tabs */}
            <div className="px-5 py-3 border-b border-border flex items-center gap-4">
              <span className="text-lg">📚</span>
              <h3 className="text-sm font-semibold text-text-primary">Case Study Analysis</h3>
              {!isLoading && (
                <div className="ml-auto flex gap-1 bg-bg-tertiary rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('text')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === 'text' ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >📝 Analysis</button>
                  <button
                    onClick={() => setViewMode('story')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      viewMode === 'story' ? 'bg-bg-secondary text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >🎬 Visual Story</button>
                </div>
              )}
              {isLoading && <LoaderIcon className="w-4 h-4 text-accent animate-spin ml-auto" />}
            </div>

            {/* Text (default) */}
            {viewMode === 'text' && (
              <div ref={resultRef} className="px-5 py-4 max-h-[70vh] overflow-y-auto">
                <div className="prose prose-invert prose-sm max-w-none
                  prose-headings:text-text-primary prose-headings:font-semibold prose-headings:tracking-tight
                  prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
                  prose-h4:text-sm prose-h4:mt-4 prose-h4:mb-1
                  prose-p:text-text-secondary prose-p:leading-relaxed
                  prose-strong:text-text-primary prose-strong:font-semibold
                  prose-li:text-text-secondary prose-li:leading-relaxed
                  prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                  prose-table:w-full prose-table:my-3 prose-table:text-xs prose-table:border-collapse
                  prose-thead:border-b prose-thead:border-border
                  prose-th:bg-bg-tertiary prose-th:text-text-primary prose-th:font-semibold prose-th:px-3 prose-th:py-2 prose-th:text-left
                  prose-td:text-text-secondary prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-border
                  prose-code:text-accent prose-code:bg-bg-tertiary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                  prose-pre:bg-bg-tertiary prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:text-xs
                  prose-blockquote:border-l-2 prose-blockquote:border-accent prose-blockquote:pl-4 prose-blockquote:text-text-secondary prose-blockquote:italic
                ">
                  <MarkdownWithMermaid content={result} />
                </div>
              </div>
            )}

            {/* Visual Story */}
            {viewMode === 'story' && !isLoading && <VisualStory content={result} />}
          </section>
        )}

        {/* Disclaimer */}
        <div className="px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400/80 leading-relaxed">
          <strong>Disclaimer:</strong> Case studies are AI-generated summaries for educational purposes. Case citations and details should be verified from official sources like <a href="https://indiankanoon.org" target="_blank" rel="noopener noreferrer" className="text-accent underline">Indian Kanoon</a> or <a href="https://main.sci.gov.in" target="_blank" rel="noopener noreferrer" className="text-accent underline">SCI Website</a>. This does not constitute legal advice.
        </div>
      </div>
    </div>
  );
};

// ── Section color/icon mapping ─────────────────────────────────────
const SECTION_THEMES: Record<string, { icon: string; color: string; gradient: string }> = {
  'case identity':   { icon: '📋', color: 'from-blue-500/20 to-blue-600/5', gradient: 'border-blue-500/30' },
  'background':      { icon: '📖', color: 'from-purple-500/20 to-purple-600/5', gradient: 'border-purple-500/30' },
  'parties':         { icon: '👥', color: 'from-teal-500/20 to-teal-600/5', gradient: 'border-teal-500/30' },
  'facts':           { icon: '📜', color: 'from-amber-500/20 to-amber-600/5', gradient: 'border-amber-500/30' },
  'legal issues':    { icon: '⚖️', color: 'from-red-500/20 to-red-600/5', gradient: 'border-red-500/30' },
  'arguments':       { icon: '📊', color: 'from-orange-500/20 to-orange-600/5', gradient: 'border-orange-500/30' },
  'judgment':        { icon: '🏛️', color: 'from-emerald-500/20 to-emerald-600/5', gradient: 'border-emerald-500/30' },
  'legal principle': { icon: '📐', color: 'from-cyan-500/20 to-cyan-600/5', gradient: 'border-cyan-500/30' },
  'related cases':   { icon: '🔗', color: 'from-indigo-500/20 to-indigo-600/5', gradient: 'border-indigo-500/30' },
  'impact':          { icon: '📈', color: 'from-pink-500/20 to-pink-600/5', gradient: 'border-pink-500/30' },
  'links':           { icon: '🌐', color: 'from-sky-500/20 to-sky-600/5', gradient: 'border-sky-500/30' },
  'visual':          { icon: '🗺️', color: 'from-violet-500/20 to-violet-600/5', gradient: 'border-violet-500/30' },
};

const getTheme = (title: string) => {
  const lower = title.toLowerCase();
  for (const [key, val] of Object.entries(SECTION_THEMES)) {
    if (lower.includes(key)) return val;
  }
  return { icon: '📄', color: 'from-gray-500/20 to-gray-600/5', gradient: 'border-gray-500/30' };
};

// ── Visual Story Component ─────────────────────────────────────────
const VisualStory: React.FC<{ content: string }> = ({ content }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse result into sections using ### headings
  const sections = useMemo(() => {
    // Remove mermaid blocks and split by ### headings
    const cleaned = content;
    const parts: { title: string; body: string; mermaid?: string }[] = [];

    // Extract mermaid code
    const mermaidMatch = cleaned.match(/```mermaid\s*\n([\s\S]*?)\n?\s*```/);
    const mermaidCode = mermaidMatch ? mermaidMatch[1].trim() : '';

    // Split on ### headings
    const regex = /^### (.+)$/gm;
    let match;
    const headings: { title: string; index: number }[] = [];
    while ((match = regex.exec(cleaned)) !== null) {
      headings.push({ title: match[1].trim(), index: match.index });
    }

    for (let i = 0; i < headings.length; i++) {
      const start = headings[i].index + headings[i].title.length + 4; // skip "### title\n"
      const end = i < headings.length - 1 ? headings[i + 1].index : cleaned.length;
      let body = cleaned.slice(start, end).trim();
      // Remove mermaid block from body text
      body = body.replace(/```mermaid[\s\S]*?```/g, '').trim();
      if (body || headings[i].title.toLowerCase().includes('visual')) {
        parts.push({
          title: headings[i].title.replace(/^[^\w\s]*\s*/, '').replace(/^(📋|📖|👥|📜|⚖️|📊|🏛️|📐|🔗|📈|🌐|🗺️)\s*/, ''),
          body,
          mermaid: headings[i].title.toLowerCase().includes('visual') ? mermaidCode : undefined,
        });
      }
    }

    // Add mermaid as its own slide if it exists and wasn't in a "visual" section
    if (mermaidCode && !parts.some(p => p.mermaid)) {
      parts.push({ title: 'Visual Case Flow', body: '', mermaid: mermaidCode });
    }

    return parts;
  }, [content]);

  // Auto-play
  useEffect(() => {
    if (isPlaying && sections.length > 1) {
      intervalRef.current = setInterval(() => {
        setSlideDirection('next');
        setCurrentSlide(prev => {
          if (prev >= sections.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 5000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, sections.length]);

  const goTo = (idx: number) => {
    setSlideDirection(idx > currentSlide ? 'next' : 'prev');
    setCurrentSlide(idx);
  };
  const goPrev = () => { if (currentSlide > 0) goTo(currentSlide - 1); };
  const goNext = () => { if (currentSlide < sections.length - 1) goTo(currentSlide + 1); };

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentSlide, sections.length]);

  if (sections.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-text-tertiary text-sm">
        Waiting for complete analysis to build the visual story…
      </div>
    );
  }

  const current = sections[currentSlide];
  const theme = getTheme(current?.title || '');
  const progress = ((currentSlide + 1) / sections.length) * 100;

  return (
    <div ref={containerRef} className="relative">
      {/* Progress Bar */}
      <div className="h-1 bg-bg-tertiary">
        <div
          className="h-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-elevated text-text-secondary hover:text-text-primary text-xs font-medium transition-all"
          >
            {isPlaying ? (
              <><PauseIcon className="w-3.5 h-3.5" /> Pause</>
            ) : (
              <><PlayIcon className="w-3.5 h-3.5" /> Auto-Play</>
            )}
          </button>
          <span className="text-[11px] text-text-quaternary">
            {currentSlide + 1} / {sections.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            disabled={currentSlide === 0}
            className="p-2 rounded-lg hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevLeftIcon className="w-4 h-4" />
          </button>
          <button
            onClick={goNext}
            disabled={currentSlide === sections.length - 1}
            className="p-2 rounded-lg hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide */}
      <div className="px-4 sm:px-5 py-4 sm:py-6 min-h-[280px] sm:min-h-[360px] max-h-[65vh] overflow-y-auto">
        <div
          key={currentSlide}
          className={`cs-slide-enter-${slideDirection}`}
        >
          {/* Section Header */}
          <div className={`flex items-center gap-3 mb-5 px-4 py-3 rounded-xl bg-gradient-to-r ${theme.color} border ${theme.gradient}`}>
            <span className="text-2xl">{getTheme(current.title).icon}</span>
            <div>
              <p className="text-[10px] text-text-quaternary uppercase tracking-wider font-semibold">
                Step {currentSlide + 1} of {sections.length}
              </p>
              <h3 className="text-base font-semibold text-text-primary">{current.title}</h3>
            </div>
          </div>

          {/* Body */}
          {current.body && (
            <div className="prose prose-invert prose-sm max-w-none
              prose-headings:text-text-primary prose-headings:font-semibold
              prose-h4:text-sm prose-h4:mt-4 prose-h4:mb-1
              prose-p:text-text-secondary prose-p:leading-relaxed
              prose-strong:text-text-primary prose-strong:font-semibold
              prose-li:text-text-secondary prose-li:leading-relaxed
              prose-a:text-accent
              prose-table:w-full prose-table:my-3 prose-table:text-xs
              prose-thead:border-b prose-thead:border-border
              prose-th:bg-bg-tertiary prose-th:text-text-primary prose-th:font-semibold prose-th:px-3 prose-th:py-2 prose-th:text-left
              prose-td:text-text-secondary prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-border
              prose-code:text-accent prose-code:bg-bg-tertiary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
              prose-blockquote:border-l-2 prose-blockquote:border-accent prose-blockquote:pl-4 prose-blockquote:italic
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{current.body}</ReactMarkdown>
            </div>
          )}

          {/* Mermaid Diagram */}
          {current.mermaid && (
            <div className="mt-5 bg-bg rounded-xl border border-border p-4 overflow-hidden">
              <p className="text-[11px] text-text-quaternary uppercase tracking-wider font-semibold mb-3">🗺️ Case Progression Diagram</p>
              <MermaidBlock code={current.mermaid} />
            </div>
          )}
        </div>
      </div>

      {/* Slide Dots */}
      <div className="px-5 py-3 border-t border-border flex justify-center gap-1.5 flex-wrap">
        {sections.map((s, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            title={s.title}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === currentSlide
                ? 'w-6 bg-accent'
                : i < currentSlide
                  ? 'w-2 bg-accent/40'
                  : 'w-2 bg-bg-tertiary hover:bg-text-quaternary'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// ── Local icons ────────────────────────────────────────────────────
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
);

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="6 3 20 12 6 21 6 3"/>
  </svg>
);

const PauseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>
  </svg>
);

const ChevLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

const ChevRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m9 18 6-6-6-6"/>
  </svg>
);
