import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { analyzeJudgment } from '../services/geminiService';
import { JudgmentAnalysis, CaseIndexEntry } from '../types';
import { LoaderIcon, ArrowRightIcon, BookOpenIcon, AlertTriangleIcon } from './Icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as pdfjsLib from 'pdfjs-dist';

// Set up pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// ── PDF Text Extraction ────────────────────────────────────────────
async function extractTextFromPdf(url: string): Promise<string> {
  const pdf = await pdfjsLib.getDocument(url).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str)
      .join(' ');
    pages.push(text);
  }
  return pages.join('\n\n');
}

// ── Tag Colors ─────────────────────────────────────────────────────
const TAG_COLORS = [
  'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'bg-violet-500/15 text-violet-400 border-violet-500/25',
  'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'bg-pink-500/15 text-pink-400 border-pink-500/25',
  'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  'bg-red-500/15 text-red-400 border-red-500/25',
  'bg-teal-500/15 text-teal-400 border-teal-500/25',
];

export const JudgmentAnalyzer = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [caseEntry, setCaseEntry] = useState<CaseIndexEntry | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const [analysis, setAnalysis] = useState<JudgmentAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'summary' | 'flow' | 'statutes' | 'citations'>('summary');
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Load the case entry metadata
  useEffect(() => {
    const loadCase = async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}cases.json`);
        const index = await res.json();
        const entry = index.cases.find((c: CaseIndexEntry) => c.id === caseId);
        if (entry) {
          setCaseEntry(entry);
        } else {
          setError('Case not found in the database.');
          setLoading(false);
        }
      } catch (err) {
        setError('Failed to load case index.');
        setLoading(false);
      }
    };
    loadCase();
  }, [caseId]);

  // Extract PDF text once we have the entry
  useEffect(() => {
    if (!caseEntry) return;

    const extractPdf = async () => {
      try {
        setProgress(10);
        const pdfUrl = `${import.meta.env.BASE_URL}pdfs/${caseEntry.filename}`;
        setProgress(20);
        const text = await extractTextFromPdf(pdfUrl);
        setPdfText(text);
        setProgress(40);
        setLoading(false);

        // Auto-analyze
        await runAnalysis(text);
      } catch (err) {
        console.error('PDF extraction failed:', err);
        setError('Failed to read the PDF file. It may be scanned/image-based.');
        setLoading(false);
      }
    };

    extractPdf();

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [caseEntry]);

  const runAnalysis = async (text: string) => {
    if (!text || text.trim().length < 100) {
      setError('PDF text is too short or empty. The file might be a scanned image.');
      return;
    }

    setAnalyzing(true);
    setProgress(50);
    abortRef.current = new AbortController();

    try {
      const result = await analyzeJudgment(
        text,
        (_chunk) => {
          // We get chunks during streaming — update progress
          setProgress(prev => Math.min(prev + 2, 90));
        },
        abortRef.current.signal
      );

      if (result) {
        setAnalysis(result);
        setProgress(100);
      } else {
        setError('AI analysis returned an invalid response. Try again.');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Analysis failed. The API might be rate-limited. Please try again.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Loading / Error States ─────────────────────────────────────
  if (loading || analyzing) {
    return (
      <div className="h-full overflow-y-auto bg-bg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
          <Link to="/judgments" className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-accent transition-colors mb-6">
            ← Back to Case Database
          </Link>

          <div className="bg-bg-secondary rounded-xl border border-border p-8 flex flex-col items-center justify-center min-h-[400px]">
            <LoaderIcon className="w-8 h-8 text-accent mb-4" />
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              {loading ? 'Reading Judgment PDF…' : 'AI is Analyzing…'}
            </h2>
            <p className="text-sm text-text-tertiary mb-6 text-center max-w-md">
              {loading
                ? 'Extracting text from the Supreme Court judgment PDF.'
                : 'Extracting statutes, citations, case flow, and generating a structured analysis.'}
            </p>

            {/* Progress bar */}
            <div className="w-full max-w-xs bg-bg-tertiary rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] text-text-quaternary mt-2">{progress}%</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto bg-bg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
          <Link to="/judgments" className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-accent transition-colors mb-6">
            ← Back to Case Database
          </Link>
          <div className="bg-bg-secondary rounded-xl border border-red-500/30 p-8 text-center">
            <AlertTriangleIcon className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-text-primary mb-2">Something Went Wrong</h2>
            <p className="text-sm text-text-tertiary mb-4">{error}</p>
            <button
              onClick={() => { setError(''); setLoading(true); window.location.reload(); }}
              className="px-5 py-2 bg-accent text-bg text-sm font-medium rounded-lg hover:bg-accent-hover transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  // ── Main Result View ───────────────────────────────────────────
  const tabs = [
    { id: 'summary' as const, label: 'Summary', icon: '📝' },
    { id: 'flow' as const, label: 'Case Flow', icon: '🔄' },
    { id: 'statutes' as const, label: 'Key Statutes', icon: '📜' },
    { id: 'citations' as const, label: 'Citations', icon: '🔗' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5 animate-fade-in">
        {/* Back button */}
        <Link to="/judgments" className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-accent transition-colors">
          ← Back to Case Database
        </Link>

        {/* ── Header Card ─────────────────────────────────────── */}
        <div className="bg-bg-secondary rounded-xl border border-border p-5 sm:p-6">
          {/* Catchword Tags */}
          {analysis.catchwords && analysis.catchwords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {analysis.catchwords.map((tag, i) => (
                <span
                  key={i}
                  className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${TAG_COLORS[i % TAG_COLORS.length]}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Case Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary leading-tight mb-1">
            {analysis.parties?.petitioner || 'Unknown'} <span className="text-text-tertiary font-normal">v.</span> {analysis.parties?.respondent || 'Unknown'}
          </h1>

          {/* Meta Row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[13px] text-text-tertiary">
            <span className="flex items-center gap-1.5">
              <span className="text-base">🏛️</span> {analysis.court}
            </span>
            {analysis.date && analysis.date !== 'unknown' && (
              <span className="flex items-center gap-1.5">
                <span className="text-base">📅</span> {analysis.date}
              </span>
            )}
            {analysis.case_type && (
              <span className="flex items-center gap-1.5">
                <span className="text-base">📂</span> {analysis.case_type}
              </span>
            )}
          </div>

          {/* Judges */}
          {analysis.judges && analysis.judges.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-text-quaternary uppercase tracking-wider font-semibold">Bench:</span>
              {analysis.judges.map((j, i) => (
                <span key={i} className="text-[12px] px-2.5 py-0.5 bg-bg-tertiary text-text-secondary rounded-md border border-border">
                  {j}
                </span>
              ))}
            </div>
          )}

          {/* Decision */}
          {analysis.decision && (
            <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
              <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Final Order</span>
              <p className="text-sm text-emerald-300 mt-1 leading-relaxed">{analysis.decision}</p>
            </div>
          )}
        </div>

        {/* ── Tab Bar ─────────────────────────────────────────── */}
        <div className="flex gap-1 bg-bg-secondary rounded-xl border border-border p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-accent text-bg shadow-sm'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab Content ─────────────────────────────────────── */}
        <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden animate-fade-in">

          {/* ── SUMMARY TAB ── */}
          {activeTab === 'summary' && (
            <div className="p-5 sm:p-6">
              <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                <span>📝</span> Judgment Summary
              </h2>
              <div className="prose prose-invert prose-sm max-w-none
                prose-p:text-text-secondary prose-p:leading-relaxed
                prose-strong:text-text-primary">
                <p className="text-[14px] leading-[1.75] text-text-secondary">{analysis.summary}</p>
              </div>
            </div>
          )}

          {/* ── CASE FLOW TAB ── */}
          {activeTab === 'flow' && (
            <div className="p-5 sm:p-6">
              <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
                <span>🔄</span> How This Case Was Resolved
              </h2>
              <div className="space-y-0">
                {analysis.case_flow?.map((step, i) => (
                  <div key={i} className="flex gap-4 group">
                    {/* Timeline Line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 transition-colors ${
                        i === (analysis.case_flow?.length ?? 0) - 1
                          ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40'
                          : 'bg-accent/15 text-accent border-2 border-accent/30'
                      }`}>
                        {step.step}
                      </div>
                      {i < (analysis.case_flow?.length ?? 0) - 1 && (
                        <div className="w-[2px] h-full min-h-[40px] bg-border my-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pb-6 flex-1 min-w-0">
                      <h3 className={`text-sm font-semibold mb-1 ${
                        i === (analysis.case_flow?.length ?? 0) - 1
                          ? 'text-emerald-400'
                          : 'text-text-primary'
                      }`}>
                        {step.stage}
                      </h3>
                      <p className="text-[13px] text-text-tertiary leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STATUTES TAB ── */}
          {activeTab === 'statutes' && (
            <div className="p-5 sm:p-6">
              <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
                <span>📜</span> Key Statutes Relied Upon
                <span className="text-[11px] px-2 py-0.5 bg-accent/15 text-accent rounded-full font-medium ml-auto">
                  {analysis.statutes?.length || 0} found
                </span>
              </h2>
              <div className="space-y-3">
                {analysis.statutes?.map((statute, i) => (
                  <div key={i} className="bg-bg rounded-xl border border-border p-4 hover:border-border-light transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-amber-400 text-sm">§</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-text-primary">
                          {statute.section}
                        </h3>
                        <p className="text-[12px] text-accent font-medium mt-0.5">{statute.act}</p>
                        <p className="text-[13px] text-text-tertiary leading-relaxed mt-2 border-t border-border pt-2">
                          {statute.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {(!analysis.statutes || analysis.statutes.length === 0) && (
                  <p className="text-sm text-text-quaternary text-center py-8">No statutes were extracted from this judgment.</p>
                )}
              </div>
            </div>
          )}

          {/* ── CITATIONS TAB ── */}
          {activeTab === 'citations' && (
            <div className="p-5 sm:p-6">
              <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
                <span>🔗</span> Citation Network
                <span className="text-[11px] px-2 py-0.5 bg-accent/15 text-accent rounded-full font-medium ml-auto">
                  {analysis.cited_cases?.length || 0} cases cited
                </span>
              </h2>
              <div className="space-y-2">
                {analysis.cited_cases?.map((cited, i) => {
                  const searchUrl = `https://indiankanoon.org/search/?formInput=${encodeURIComponent(cited.case_name)}`;
                  return (
                    <a
                      key={i}
                      href={searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-bg rounded-xl border border-border p-4 hover:border-accent/40 hover:bg-accent/[0.02] transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                            {cited.case_name}
                          </h3>
                          {cited.citation && (
                            <p className="text-[11px] text-text-quaternary font-mono mt-0.5">{cited.citation}</p>
                          )}
                          <p className="text-[13px] text-text-tertiary leading-relaxed mt-1.5">
                            → {cited.context}
                          </p>
                        </div>
                        <ArrowRightIcon className="w-4 h-4 text-text-quaternary group-hover:text-accent shrink-0 mt-1 transition-colors" />
                      </div>
                    </a>
                  );
                })}

                {(!analysis.cited_cases || analysis.cited_cases.length === 0) && (
                  <p className="text-sm text-text-quaternary text-center py-8">No case citations were found in this judgment.</p>
                )}
              </div>

              {(analysis.cited_cases?.length ?? 0) > 0 && (
                <p className="text-[11px] text-text-quaternary mt-4 text-center">
                  Click any case to view it on Indian Kanoon ↗
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Disclaimer ─────────────────────────────────────────── */}
        <div className="px-5 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center gap-2">
          <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-[11px] text-amber-400/80">
            AI-generated analysis may contain inaccuracies. Always verify with the original judgment and consult a qualified advocate.
          </span>
        </div>
      </div>
    </div>
  );
};
