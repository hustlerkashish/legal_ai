import React, { useState, useRef } from 'react';
import { analyzeDocument } from '../services/geminiService';
import { FileTextIcon, LoaderIcon, AlertTriangleIcon, BrainIcon, UploadIcon, XIcon } from './Icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const DocumentAnalyzer = () => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            loadFile(e.target.files[0]);
        }
    };

    const loadFile = (selected: File) => {
        setFile(selected);
        setAnalysis('');
        if (selected.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(selected);
        } else {
            setPreview(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.[0]) loadFile(e.dataTransfer.files[0]);
    };

    const handleClear = () => {
        setFile(null);
        setPreview(null);
        setAnalysis('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleAnalyze = async () => {
        if (!file) return;

        setIsAnalyzing(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                const result = await analyzeDocument(
                    base64Data, 
                    file.type, 
                    "Please analyze this legal document/image. Identify the document type (FIR, Contract, Notice), summary of facts, key clauses, and any immediate legal actions required."
                );
                setAnalysis(result || "");
                setIsAnalyzing(false);
            };
        } catch (err) {
            setAnalysis("**Error:** Failed to analyze document. Ensure it is a valid Image or Text file.");
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto overflow-x-hidden bg-bg">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/15 rounded-xl flex items-center justify-center">
                        <FileTextIcon className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-text-primary tracking-tight">Document Analyzer</h1>
                        <p className="text-sm text-text-secondary">Upload legal documents for AI-powered analysis</p>
                    </div>
                </div>

                {/* Upload Zone — only show when no file */}
                {!file && (
                    <section
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`rounded-xl border-2 border-dashed p-6 sm:p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
                            dragOver
                                ? 'border-accent bg-accent/5'
                                : 'border-border-light bg-bg-secondary hover:border-accent/40'
                        }`}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            onChange={handleFileChange}
                            accept="image/*,application/pdf,text/plain"
                        />
                        <div className="w-14 h-14 bg-bg-tertiary text-text-tertiary rounded-2xl flex items-center justify-center mb-4 group-hover:bg-accent group-hover:text-bg transition-colors">
                            <UploadIcon className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-text-primary mb-1">Click to upload or drag & drop</p>
                        <p className="text-xs text-text-tertiary">Images, PDFs, scanned FIRs, notices, contracts, or text files</p>
                    </section>
                )}

                {/* File Preview Card — show when file is selected */}
                {file && (
                    <section className="bg-bg-secondary rounded-xl border border-border overflow-hidden animate-slide-up">
                        {/* File header bar */}
                        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="text-lg">📎</span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                                    <p className="text-[11px] text-text-quaternary">{(file.size / 1024).toFixed(1)} KB · {file.type.split('/')[1]?.toUpperCase()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={handleClear}
                                    className="p-2 text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
                                    title="Remove file"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    className="flex items-center gap-2 px-5 py-2 bg-accent text-bg text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-all active:scale-[0.97]"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <LoaderIcon className="w-3.5 h-3.5 animate-spin" />
                                            Analyzing…
                                        </>
                                    ) : (
                                        <>
                                            <BrainIcon className="w-3.5 h-3.5" />
                                            Analyze
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Image preview */}
                        {preview && (
                            <div className="p-4 flex justify-center bg-bg max-h-64 overflow-hidden">
                                <img src={preview} alt="Preview" className="max-h-56 rounded-lg object-contain border border-border shadow-lg" />
                            </div>
                        )}

                        {/* Non-image file preview */}
                        {!preview && (
                            <div className="p-8 flex flex-col items-center justify-center bg-bg">
                                <div className="w-16 h-16 bg-bg-tertiary rounded-2xl flex items-center justify-center mb-3">
                                    <FileTextIcon className="text-text-tertiary w-7 h-7" />
                                </div>
                                <p className="text-xs text-text-quaternary">Document ready for analysis</p>
                            </div>
                        )}
                    </section>
                )}

                {/* Analysis Result */}
                {(analysis || isAnalyzing) && (
                    <section className="bg-bg-secondary rounded-xl border border-border overflow-hidden animate-slide-up">
                        {/* Header */}
                        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BrainIcon className="w-4 h-4 text-accent" />
                                <span className="text-sm font-semibold text-text-primary">Analysis Result</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {isAnalyzing && <LoaderIcon className="w-4 h-4 text-accent animate-spin" />}
                                {analysis && !isAnalyzing && (
                                    <span className="text-[10px] px-2.5 py-1 bg-emerald-500/15 text-emerald-400 rounded-full font-medium">
                                        ✓ Complete
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        {/* Content */}
                        <div className="p-5 max-h-[60vh] overflow-y-auto">
                            {isAnalyzing && !analysis && (
                                <div className="space-y-3 animate-pulse">
                                    <div className="h-3 bg-bg-tertiary rounded-full w-3/4"></div>
                                    <div className="h-3 bg-bg-tertiary rounded-full w-1/2"></div>
                                    <div className="h-3 bg-bg-tertiary rounded-full w-full"></div>
                                    <div className="h-3 bg-bg-tertiary rounded-full w-2/3"></div>
                                    <div className="h-20 bg-bg rounded-xl border border-border mt-4"></div>
                                </div>
                            )}

                            {analysis && (
                                <div className="prose prose-invert prose-sm max-w-none
                                    prose-headings:text-text-primary prose-headings:font-semibold prose-headings:tracking-tight
                                    prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2
                                    prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
                                    prose-p:text-text-secondary prose-p:leading-relaxed
                                    prose-strong:text-text-primary prose-strong:font-semibold
                                    prose-li:text-text-secondary prose-li:leading-relaxed
                                    prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                                    prose-table:text-xs prose-th:text-text-primary prose-th:bg-bg-tertiary prose-th:px-3 prose-th:py-2
                                    prose-td:text-text-secondary prose-td:px-3 prose-td:py-2 prose-td:border-border
                                    prose-code:text-accent prose-code:bg-bg-tertiary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                                    animate-fade-in
                                ">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                        
                        {/* Disclaimer */}
                        <div className="px-5 py-2.5 bg-amber-500/5 border-t border-amber-500/20 flex items-center gap-2">
                            <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <span className="text-[11px] text-amber-400/80">Automated analysis may be inaccurate. Always verify with the original document and consult a qualified advocate.</span>
                        </div>
                    </section>
                )}

                {/* Empty state — shown when no file and no result */}
                {!file && !analysis && !isAnalyzing && (
                    <section className="space-y-3">
                        <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-1">Supported documents</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                                { emoji: '📋', label: 'FIR / NCR' },
                                { emoji: '📨', label: 'Legal Notice' },
                                { emoji: '📑', label: 'Contracts' },
                                { emoji: '⚖️', label: 'Court Orders' },
                                { emoji: '🏠', label: 'Rent Deeds' },
                                { emoji: '🧾', label: 'Challans' },
                                { emoji: '📄', label: 'Affidavits' },
                                { emoji: '🔖', label: 'Any Legal Doc' },
                            ].map((item, i) => (
                                <div key={i} className="px-4 py-3 bg-bg-secondary rounded-xl border border-border text-center">
                                    <span className="text-xl block mb-1">{item.emoji}</span>
                                    <span className="text-[11px] font-medium text-text-secondary">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};