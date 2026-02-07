import React, { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { analyzeScam } from '../services/geminiService';
import { ShieldIcon, SendIcon, LoaderIcon, StopCircleIcon, GlobeIcon, ChevronDownIcon } from './Icons';

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

const EXAMPLE_SCAMS = [
  {
    label: '💡 Electricity Bill Scam',
    text: 'I got a message saying my electricity will be cut off today if I don\'t pay ₹10 on this link: bit.ly/payelectric-now. It says "URGENT: Pay immediately to avoid disconnection."',
  },
  {
    label: '🏦 KYC Expiry Scam',
    text: 'I received an SMS: "Dear Customer, your bank KYC has expired. Update now to avoid account block: http://sbi-kyc-update.in. Reply urgently."',
  },
  {
    label: '📦 Customs/Courier Scam',
    text: 'Someone called saying they are from FedEx and a parcel in my name contains drugs. They transferred me to "cyber crime police" who asked me to transfer money to a "safe RBI account".',
  },
  {
    label: '🎁 Lottery / Prize Scam',
    text: 'I got a WhatsApp from an international number saying I won ₹25 lakh in a KBC lottery. They asked me to pay ₹5000 processing fee via Google Pay to claim.',
  },
  {
    label: '💼 Job Offer Scam',
    text: 'I received a message on Telegram offering ₹5000/day for rating products on Amazon. They asked me to first deposit ₹500 as "registration fee" via UPI.',
  },
];

export const ScamCheck: React.FC = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = useCallback(async (text?: string) => {
    const messageToCheck = text || input.trim();
    if (!messageToCheck || isLoading) return;

    if (text) setInput(text);

    setResult('');
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      await analyzeScam(
        messageToCheck,
        language,
        (chunk) => {
          setResult((prev) => prev + chunk);
          // Auto-scroll result
          requestAnimationFrame(() => {
            if (resultRef.current) {
              resultRef.current.scrollTop = resultRef.current.scrollHeight;
            }
          });
        },
        abortControllerRef.current.signal
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setResult((prev) => prev + '\n\n❌ An error occurred. Please try again.');
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
      handleAnalyze();
    }
  };

  const selectedLang = LANGUAGE_OPTIONS.find((l) => l.code === language) || LANGUAGE_OPTIONS[0];

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-red-500/15 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🕵️</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary tracking-tight">Scam Check</h1>
              <p className="text-sm text-text-secondary">Paste a suspicious message — we'll tell you if it's a scam</p>
            </div>
          </div>

          {/* Language Selector */}
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

        {/* Emergency Banner */}
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 rounded-xl border border-red-500/20">
          <span className="text-lg">🚨</span>
          <div className="text-xs text-red-400 leading-relaxed">
            <strong>Lost money to a scam?</strong> Call <strong className="text-red-300">1930</strong> (Cyber Crime Helpline) immediately — the first 24 hours are critical for fund recovery. File online at <strong className="text-red-300">cybercrime.gov.in</strong>
          </div>
        </div>

        {/* Input Section */}
        <section className="bg-bg-secondary rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldIcon className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Paste the suspicious message, SMS, email or describe the call</h2>
          </div>

          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={5}
              placeholder={`e.g. "I got a message saying my electricity will be cut off if I don't pay ₹10 on this link..."\n\nPaste the exact message, or describe what happened.`}
              className="w-full px-4 py-3 bg-bg-tertiary text-text-primary text-sm rounded-lg border border-border focus:border-accent focus:outline-none placeholder:text-text-quaternary transition-colors resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-text-quaternary">Press Enter to analyze · Shift+Enter for new line</p>
            <div className="flex gap-2">
              {isLoading ? (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-all active:scale-[0.97]"
                >
                  <StopCircleIcon className="w-4 h-4" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => handleAnalyze()}
                  disabled={!input.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-bg rounded-lg text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <SendIcon className="w-4 h-4" />
                  Analyze
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Example Scams (only when no result) */}
        {!result && !isLoading && (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-1">Try an example</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {EXAMPLE_SCAMS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => handleAnalyze(ex.text)}
                  className="text-left px-4 py-3 bg-bg-secondary rounded-xl border border-border hover:border-border-light hover:bg-bg-tertiary transition-all group"
                >
                  <span className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">{ex.label}</span>
                  <p className="text-xs text-text-tertiary mt-1 line-clamp-2 leading-relaxed">{ex.text}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Result */}
        {(result || isLoading) && (
          <section className="bg-bg-secondary rounded-xl border border-border overflow-hidden animate-slide-up">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <span className="text-lg">🕵️</span>
              <h3 className="text-sm font-semibold text-text-primary">Analysis Report</h3>
              {isLoading && (
                <LoaderIcon className="w-4 h-4 text-accent animate-spin ml-auto" />
              )}
            </div>
            <div ref={resultRef} className="px-5 py-4 max-h-[60vh] overflow-y-auto">
              <div className="prose prose-invert prose-sm max-w-none
                prose-headings:text-text-primary prose-headings:font-semibold prose-headings:tracking-tight
                prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
                prose-p:text-text-secondary prose-p:leading-relaxed
                prose-strong:text-text-primary prose-strong:font-semibold
                prose-li:text-text-secondary prose-li:leading-relaxed
                prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                prose-table:text-xs prose-th:text-text-primary prose-th:bg-bg-tertiary prose-th:px-3 prose-th:py-2
                prose-td:text-text-secondary prose-td:px-3 prose-td:py-2 prose-td:border-border
                prose-code:text-accent prose-code:bg-bg-tertiary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </div>
            </div>
          </section>
        )}

        {/* Bottom Info Cards */}
        {!result && !isLoading && (
          <div className="grid sm:grid-cols-3 gap-3">
            <InfoCard
              emoji="📱"
              title="Report Spam SMS"
              text="Forward the SMS to 1909 to register DND complaint with TRAI."
            />
            <InfoCard
              emoji="🏦"
              title="UPI Fraud?"
              text="Report within 3 days to your bank and NPCI for fund reversal chances."
            />
            <InfoCard
              emoji="🔒"
              title="Stay Safe"
              text="Never share OTP, CVV, or UPI PIN. No bank or govt agency will ever ask for it."
            />
          </div>
        )}

        {/* Disclaimer */}
        <div className="px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400/80 leading-relaxed">
          <strong>Disclaimer:</strong> Scam Check is an AI analysis tool for educational awareness. It does not constitute legal advice. If you have been defrauded, contact the Cyber Crime Helpline at <strong>1930</strong> or file an FIR immediately.
        </div>
      </div>
    </div>
  );
};

const InfoCard: React.FC<{ emoji: string; title: string; text: string }> = ({ emoji, title, text }) => (
  <div className="px-4 py-3.5 bg-bg-secondary rounded-xl border border-border">
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-base">{emoji}</span>
      <span className="text-xs font-semibold text-text-primary">{title}</span>
    </div>
    <p className="text-xs text-text-secondary leading-relaxed">{text}</p>
  </div>
);
