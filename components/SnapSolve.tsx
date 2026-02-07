import React, { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { snapAndSolve } from '../services/geminiService';
import { LoaderIcon, StopCircleIcon, UploadIcon, GlobeIcon, ChevronDownIcon } from './Icons';

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

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export const SnapSolve: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Load a selected file
  const loadFile = useCallback((selected: File) => {
    if (!SUPPORTED_TYPES.includes(selected.type) && !selected.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, WebP, HEIC).');
      return;
    }
    setFile(selected);
    setResult('');
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(selected);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) loadFile(e.target.files[0]);
  };

  // Drag & drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) loadFile(e.dataTransfer.files[0]);
  }, [loadFile]);

  // Analyze
  const handleAnalyze = useCallback(async () => {
    if (!file || isLoading) return;

    setResult('');
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await snapAndSolve(
        base64,
        file.type,
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
        setResult((prev) => prev + '\n\n❌ An error occurred while analyzing the image. Please try again.');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [file, isLoading, language]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setResult('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const selectedLang = LANGUAGE_OPTIONS.find((l) => l.code === language) || LANGUAGE_OPTIONS[0];

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-violet-500/15 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📸</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary tracking-tight">Snap & Solve</h1>
              <p className="text-sm text-text-secondary">Photo a document — AI reads & explains it</p>
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

        {/* Upload Zone */}
        {!preview && (
          <section
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
              dragOver
                ? 'border-accent bg-accent/5'
                : 'border-border-light bg-bg-secondary hover:border-accent/40'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              accept="image/*"
            />
            <div className="w-14 h-14 bg-bg-tertiary rounded-2xl flex items-center justify-center mb-4 group-hover:bg-accent group-hover:text-bg transition-colors text-text-tertiary">
              <UploadIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">Upload or drag a photo</p>
            <p className="text-xs text-text-tertiary mb-5">JPEG, PNG, WebP, HEIC — photos of challans, notices, FIRs, agreements</p>

            {/* Camera button for mobile */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                cameraInputRef.current?.click();
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-bg rounded-lg text-sm font-medium transition-all active:scale-[0.97]"
            >
              <CameraIcon className="w-4 h-4" />
              Take a Photo
            </button>
            <input
              type="file"
              ref={cameraInputRef}
              className="hidden"
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
            />
          </section>
        )}

        {/* Preview + Actions */}
        {preview && (
          <section className="bg-bg-secondary rounded-xl border border-border overflow-hidden animate-slide-up">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg">📎</span>
                <span className="text-sm font-medium text-text-primary truncate">{file?.name}</span>
                <span className="text-xs text-text-quaternary flex-shrink-0">
                  {file ? (file.size / 1024).toFixed(1) + ' KB' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <button
                    onClick={handleStop}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-all"
                  >
                    <StopCircleIcon className="w-3.5 h-3.5" />
                    Stop
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleClear}
                      className="px-3 py-2 text-xs text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleAnalyze}
                      className="flex items-center gap-1.5 px-5 py-2 bg-accent hover:bg-accent-hover text-bg rounded-lg text-xs font-medium transition-all active:scale-[0.97]"
                    >
                      <span className="text-sm">🔍</span>
                      Read & Explain
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Image Preview */}
            <div className="p-4 flex justify-center bg-bg max-h-72 overflow-hidden">
              <img
                src={preview}
                alt="Document preview"
                className="max-h-64 rounded-lg object-contain border border-border shadow-lg"
              />
            </div>
          </section>
        )}

        {/* Result */}
        {(result || isLoading) && (
          <section className="bg-bg-secondary rounded-xl border border-border overflow-hidden animate-slide-up">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <span className="text-lg">📋</span>
              <h3 className="text-sm font-semibold text-text-primary">Document Analysis</h3>
              {isLoading && (
                <LoaderIcon className="w-4 h-4 text-accent animate-spin ml-auto" />
              )}
            </div>
            <div ref={resultRef} className="px-5 py-4 max-h-[60vh] overflow-y-auto">
              <div className="prose prose-invert prose-sm max-w-none
                prose-headings:text-text-primary prose-headings:font-semibold prose-headings:tracking-tight
                prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2
                prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
                prose-p:text-text-secondary prose-p:leading-relaxed
                prose-strong:text-text-primary prose-strong:font-semibold
                prose-li:text-text-secondary prose-li:leading-relaxed
                prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                prose-code:text-accent prose-code:bg-bg-tertiary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                prose-pre:bg-bg-tertiary prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:text-text-secondary prose-pre:text-xs
                prose-table:text-xs prose-th:text-text-primary prose-th:bg-bg-tertiary prose-th:px-3 prose-th:py-2
                prose-td:text-text-secondary prose-td:px-3 prose-td:py-2 prose-td:border-border
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </div>
            </div>
          </section>
        )}

        {/* Document type hints (shown when idle) */}
        {!preview && !result && (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-1">
              Works great with
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { emoji: '🚔', label: 'Traffic Challan', desc: 'E-challan or paper challan' },
                { emoji: '⚖️', label: 'Court Notice / Summons', desc: 'Civil or criminal summons' },
                { emoji: '📋', label: 'FIR Copy', desc: 'First Information Report' },
                { emoji: '📨', label: 'Legal Notice', desc: 'Advocate / party notice' },
                { emoji: '🏠', label: 'Rent Agreement', desc: 'Lease or rental deed' },
                { emoji: '📝', label: 'Any Legal Doc', desc: 'Affidavits, orders, bonds' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="px-4 py-3 bg-bg-secondary rounded-xl border border-border"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{item.emoji}</span>
                    <span className="text-xs font-semibold text-text-primary">{item.label}</span>
                  </div>
                  <p className="text-[11px] text-text-tertiary">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Disclaimer */}
        <div className="px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400/80 leading-relaxed">
          <strong>Disclaimer:</strong> Snap & Solve uses AI-based OCR which may misread handwritten or low-quality images. Always verify the extracted text against the original document. This is for educational purposes only and does not constitute legal advice.
        </div>
      </div>
    </div>
  );
};

// ── Local icon ─────────────────────────────────────────────────────
const CameraIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
    <circle cx="12" cy="13" r="3"/>
  </svg>
);
