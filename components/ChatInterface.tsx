import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, MessageRole, ComplexityLevel } from '../types';
import { streamChatResponse, simplifyLegalText, generateActionPlan, generateJurisdictionAnalysis } from '../services/geminiService';
import { SendIcon, LoaderIcon, BrainIcon, ScaleIcon, MicIcon, MicOffIcon, GlobeIcon, ChevronDownIcon, StopCircleIcon, WandIcon, BookOpenTextIcon, ClipboardListIcon, CompassIcon, CopyIcon, CheckIcon, DownloadIcon, RefreshIcon, PlusIcon, ArrowDownIcon } from './Icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const LANGUAGES = [
  { code: 'en', label: 'English', speechCode: 'en-IN' },
  { code: 'hi', label: 'हिन्दी', speechCode: 'hi-IN' },
  { code: 'bn', label: 'বাংলা', speechCode: 'bn-IN' },
  { code: 'ta', label: 'தமிழ்', speechCode: 'ta-IN' },
  { code: 'te', label: 'తెలుగు', speechCode: 'te-IN' },
  { code: 'mr', label: 'मराठी', speechCode: 'mr-IN' },
  { code: 'gu', label: 'ગુજરાતી', speechCode: 'gu-IN' },
  { code: 'kn', label: 'ಕನ್ನಡ', speechCode: 'kn-IN' },
  { code: 'ml', label: 'മലயാളം', speechCode: 'ml-IN' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', speechCode: 'pa-IN' },
  { code: 'ur', label: 'اردو', speechCode: 'ur-IN' },
];

const SUGGESTED_QUERIES = [
  { category: '⚖️ Criminal', queries: ['What are my rights if arrested?', 'Explain the FIR process'] },
  { category: '👨‍👩‍👧 Family', queries: ['How to file for divorce?', 'Child custody rights in India'] },
  { category: '🏠 Property', queries: ['Tenant eviction process', 'Property registration steps'] },
  { category: '🛒 Consumer', queries: ['File a consumer complaint', 'Defective product refund rights'] },
];

const WELCOME_MSG: ChatMessage = { id: 'welcome', role: MessageRole.Model, text: '', timestamp: new Date() };

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

interface ChatInterfaceProps {
  initialQuery?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ initialQuery }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [complexity, setComplexity] = useState<ComplexityLevel>(ComplexityLevel.Standard);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [, setTick] = useState(0);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const accumulatedTextRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (initialQuery) {
        handleSend(initialQuery);
    }
  }, []);

  // Tick for time-ago updates
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Scroll detection for "scroll to bottom" pill
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollBtn(distFromBottom > 150);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Close language menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handleCopy = useCallback(async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* noop */ }
  }, []);

  const handleExport = useCallback(() => {
    const conversationText = messages
      .filter(m => m.id !== 'welcome')
      .map(m => `[${m.timestamp.toLocaleString()}] ${m.role === MessageRole.User ? 'You' : 'Legal AI'}:\n${m.text}\n`)
      .join('\n---\n\n');
    const header = `Legal AI — Conversation Export\nExported: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;
    const blob = new Blob([header + conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legal-ai-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  const handleCopyAll = useCallback(async () => {
    const conversationText = messages
      .filter(m => m.id !== 'welcome')
      .map(m => `${m.role === MessageRole.User ? 'You' : 'Legal AI'}: ${m.text}`)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(conversationText);
      setCopiedId('all');
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* noop */ }
  }, [messages]);

  const handleNewChat = useCallback(() => {
    if (isLoading) return;
    setMessages([{ ...WELCOME_MSG, timestamp: new Date() }]);
    setInput('');
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, [isLoading]);

  // Speech-to-text with auto-send on 5s silence
  const stopAndSend = useCallback((text: string) => {
    recognitionRef.current?.stop();
    setIsListening(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (text.trim()) {
      // Use setTimeout to let state settle before sending
      setTimeout(() => {
        handleSend(text.trim());
      }, 100);
    }
  }, []);

  const toggleListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language.speechCode;
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    accumulatedTextRef.current = input;

    // Reset silence timer helper
    const resetSilenceTimer = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        // 5 seconds of silence — auto-send and stop
        const textToSend = accumulatedTextRef.current;
        recognitionRef.current?.stop();
        setIsListening(false);
        if (textToSend.trim()) {
          setInput(textToSend.trim());
          setTimeout(() => handleSend(textToSend.trim()), 100);
        }
      }, 5000);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = accumulatedTextRef.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? ' ' : '') + transcript;
          accumulatedTextRef.current = finalTranscript;
        }
      }
      setInput(finalTranscript);
      resetSilenceTimer();
    };

    recognition.onerror = () => {
      setIsListening(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    resetSilenceTimer(); // Start initial silence timer
    recognition.start();
    setIsListening(true);
  }, [isListening, language, input]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: MessageRole.User,
      text: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);

    const botMsgId = (Date.now() + 1).toString();
    const botMsg: ChatMessage = {
      id: botMsgId,
      role: MessageRole.Model,
      text: '',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, botMsg]);

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const history = messages
        .filter(m => m.id !== 'welcome' && !m.isError)
        .map(m => ({
          role: m.role === MessageRole.User ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

      await streamChatResponse(
        history, 
        text, 
        complexity, 
        language.code,
        (chunk) => {
          if (abortController.signal.aborted) return;
          setMessages(prev => prev.map(m => 
            m.id === botMsgId 
              ? { ...m, text: m.text + chunk, isLoading: false } 
              : m
          ));
        },
        abortController.signal
      );
    } catch (error: any) {
      if (error?.name === 'AbortError' || abortController.signal.aborted) {
        // Stopped by user — mark whatever we have as final
        setMessages(prev => prev.map(m => 
          m.id === botMsgId 
            ? { ...m, isLoading: false } 
            : m
        ));
      } else {
        console.error(error);
        setMessages(prev => prev.map(m => 
          m.id === botMsgId 
            ? { ...m, text: "**Error:** Unable to connect to legal database. Please check your connection or API key.", isError: true, isLoading: false } 
            : m
        ));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRetry = useCallback((errorMsgId: string) => {
    const idx = messages.findIndex(m => m.id === errorMsgId);
    if (idx < 1) return;
    let userText = '';
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === MessageRole.User) { userText = messages[i].text; break; }
    }
    if (!userText) return;
    setMessages(prev => prev.filter(m => m.id !== errorMsgId));
    setTimeout(() => handleSend(userText), 100);
  }, [messages]);

  const handleSimplify = async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || msg.isSimplifying) return;

    // If already simplified, just toggle the view
    if (msg.simplifiedText) {
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, showSimplified: !m.showSimplified } : m
      ));
      return;
    }

    // Start simplifying
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, isSimplifying: true, showSimplified: true, simplifiedText: '' } : m
    ));

    try {
      await simplifyLegalText(
        msg.text,
        language.code,
        (chunk) => {
          setMessages(prev => prev.map(m =>
            m.id === msgId
              ? { ...m, simplifiedText: (m.simplifiedText || '') + chunk }
              : m
          ));
        }
      );
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === msgId
          ? { ...m, simplifiedText: '**Error:** Could not simplify this response. Please try again.' }
          : m
      ));
    } finally {
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, isSimplifying: false } : m
      ));
    }
  };

  const handleActionPlan = async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || msg.isGeneratingPlan) return;

    // If already generated, just toggle the view
    if (msg.actionPlanText) {
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, showActionPlan: !m.showActionPlan, showSimplified: false } : m
      ));
      return;
    }

    // Start generating
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, isGeneratingPlan: true, showActionPlan: true, showSimplified: false, actionPlanText: '' } : m
    ));

    try {
      await generateActionPlan(
        msg.text,
        language.code,
        (chunk) => {
          setMessages(prev => prev.map(m =>
            m.id === msgId
              ? { ...m, actionPlanText: (m.actionPlanText || '') + chunk }
              : m
          ));
        }
      );
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === msgId
          ? { ...m, actionPlanText: '**Error:** Could not generate action plan. Please try again.' }
          : m
      ));
    } finally {
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, isGeneratingPlan: false } : m
      ));
    }
  };

  const handleJurisdiction = async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || msg.isGeneratingJurisdiction) return;

    // If already generated, just toggle the view
    if (msg.jurisdictionText) {
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, showJurisdiction: !m.showJurisdiction, showSimplified: false, showActionPlan: false } : m
      ));
      return;
    }

    // Start generating
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, isGeneratingJurisdiction: true, showJurisdiction: true, showSimplified: false, showActionPlan: false, jurisdictionText: '' } : m
    ));

    try {
      await generateJurisdictionAnalysis(
        msg.text,
        language.code,
        (chunk) => {
          setMessages(prev => prev.map(m =>
            m.id === msgId
              ? { ...m, jurisdictionText: (m.jurisdictionText || '') + chunk }
              : m
          ));
        }
      );
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === msgId
          ? { ...m, jurisdictionText: '**Error:** Could not determine jurisdiction. Please try again.' }
          : m
      ));
    } finally {
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, isGeneratingJurisdiction: false } : m
      ));
    }
  };

  const hasConversation = messages.length > 1;
  const charCount = input.length;

  return (
    <div className="flex flex-col h-full bg-bg relative">
      {/* Toolbar */}
      <div className="bg-bg-secondary border-b border-border px-4 py-2.5 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
            <BrainIcon className="text-accent w-4 h-4" />
            <span className="text-sm font-medium text-text-secondary hidden md:block">Legal Reasoning Engine</span>

            {/* Language Selector */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-bg-tertiary hover:bg-bg-elevated text-text-secondary transition-all border border-border"
              >
                <GlobeIcon className="w-3.5 h-3.5" />
                <span>{language.label}</span>
                <ChevronDownIcon className="w-3 h-3" />
              </button>
              {showLangMenu && (
                <div className="absolute top-full left-0 mt-1 bg-bg-elevated border border-border-light rounded-lg shadow-xl py-1 z-50 min-w-[140px] max-h-[240px] overflow-y-auto animate-fade-in">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang); setShowLangMenu(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        language.code === lang.code
                          ? 'bg-accent text-bg font-medium'
                          : 'text-text-secondary hover:bg-bg-hover'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
        </div>
        <div className="flex items-center gap-2">
          {hasConversation && (
            <div className="flex items-center gap-1 mr-2">
              <button onClick={handleCopyAll} className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary rounded-lg transition-all" title="Copy full conversation">
                {copiedId === 'all' ? <CheckIcon className="w-3 h-3 text-emerald-400" /> : <CopyIcon className="w-3 h-3" />}
                <span className="hidden md:inline">{copiedId === 'all' ? 'Copied!' : 'Copy All'}</span>
              </button>
              <button onClick={handleExport} className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary rounded-lg transition-all" title="Download conversation">
                <DownloadIcon className="w-3 h-3" />
                <span className="hidden md:inline">Export</span>
              </button>
            </div>
          )}
          <button onClick={handleNewChat} disabled={isLoading || messages.length <= 1} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-border" title="Start new conversation">
            <PlusIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">New Chat</span>
          </button>
          <div className="flex gap-1">
            {(Object.keys(ComplexityLevel) as Array<keyof typeof ComplexityLevel>).map((key) => (
                <button
                    key={key}
                    onClick={() => setComplexity(ComplexityLevel[key])}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                        complexity === ComplexityLevel[key]
                            ? 'bg-accent text-bg'
                            : 'text-text-tertiary hover:bg-bg-tertiary hover:text-text-secondary'
                    }`}
                >
                    {ComplexityLevel[key]}
                </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6" ref={scrollContainerRef}>
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.map((msg) => {
            // Welcome card
            if (msg.id === 'welcome') {
              return (
                <div key={msg.id} className="animate-fade-in">
                  <div className="flex justify-start">
                    <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                      <ScaleIcon className="w-3.5 h-3.5 text-bg" />
                    </div>
                    <div className="max-w-[85%] md:max-w-[75%]">
                      <div className="bg-bg-secondary border border-border rounded-2xl rounded-bl-md p-5">
                        <h3 className="text-base font-semibold text-text-primary mb-1">Namaste! I'm <span className="text-accent">Legal AI</span></h3>
                        <p className="text-sm text-text-secondary mb-4">Your AI-powered Indian legal assistant. Ask me anything about laws, rights, or procedures.</p>
                        <div className="grid grid-cols-2 gap-2 mb-1">
                          {[
                            { icon: <BookOpenTextIcon className="w-3.5 h-3.5" />, label: 'Legal Response', desc: 'Detailed legal analysis', color: 'text-text-primary bg-bg-tertiary' },
                            { icon: <WandIcon className="w-3.5 h-3.5" />, label: 'Simplify', desc: "Explain like I'm 10", color: 'text-accent bg-accent/10' },
                            { icon: <ClipboardListIcon className="w-3.5 h-3.5" />, label: 'Action Plan', desc: 'Step-by-step guidance', color: 'text-emerald-400 bg-emerald-500/10' },
                            { icon: <CompassIcon className="w-3.5 h-3.5" />, label: 'Where to File', desc: 'Courts & jurisdiction', color: 'text-violet-400 bg-violet-500/10' },
                          ].map((mode, i) => (
                            <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg ${mode.color}`}>
                              <div className="mt-0.5">{mode.icon}</div>
                              <div>
                                <div className="text-xs font-semibold">{mode.label}</div>
                                <div className="text-[10px] opacity-70">{mode.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
            <div
              key={msg.id}
              className={`flex ${msg.role === MessageRole.User ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              {msg.role === MessageRole.Model && (
                <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                  <ScaleIcon className="w-3.5 h-3.5 text-bg" />
                </div>
              )}
              <div
                className={`max-w-[80%] md:max-w-[70%] text-sm leading-relaxed ${
                  msg.role === MessageRole.User
                    ? 'bg-bg-tertiary text-text-primary px-4 py-3 rounded-2xl rounded-br-md border border-border'
                    : 'bg-bg-secondary border border-border text-text-primary px-4 py-3 rounded-2xl rounded-bl-md'
                } ${msg.isError ? 'border-red-500/30 bg-red-900/20 text-red-300' : ''}`}
              >
                {/* View mode toggle tabs */}
                {msg.role === MessageRole.Model && (msg.simplifiedText !== undefined || msg.actionPlanText !== undefined || msg.jurisdictionText !== undefined) && (
                  <div className="flex items-center gap-1 mb-3 pb-2 border-b border-border flex-wrap">
                    <button
                      onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, showSimplified: false, showActionPlan: false, showJurisdiction: false } : m))}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                        !msg.showSimplified && !msg.showActionPlan && !msg.showJurisdiction ? 'bg-bg-tertiary text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
                      }`}
                    >
                      <BookOpenTextIcon className="w-3 h-3" /> Legal
                    </button>
                    {msg.simplifiedText !== undefined && (
                      <button
                        onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, showSimplified: true, showActionPlan: false, showJurisdiction: false } : m))}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                          msg.showSimplified ? 'bg-accent/15 text-accent' : 'text-text-tertiary hover:text-text-secondary'
                        }`}
                      >
                        <WandIcon className="w-3 h-3" /> Simple
                      </button>
                    )}
                    {msg.actionPlanText !== undefined && (
                      <button
                        onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, showActionPlan: true, showSimplified: false, showJurisdiction: false } : m))}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                          msg.showActionPlan ? 'bg-emerald-500/15 text-emerald-400' : 'text-text-tertiary hover:text-text-secondary'
                        }`}
                      >
                        <ClipboardListIcon className="w-3 h-3" /> Action Plan
                      </button>
                    )}
                    {msg.jurisdictionText !== undefined && (
                      <button
                        onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, showJurisdiction: true, showSimplified: false, showActionPlan: false } : m))}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                          msg.showJurisdiction ? 'bg-violet-500/15 text-violet-400' : 'text-text-tertiary hover:text-text-secondary'
                        }`}
                      >
                        <CompassIcon className="w-3 h-3" /> Where to File
                      </button>
                    )}
                  </div>
                )}

                <div className="prose prose-sm prose-invert max-w-none
                  prose-p:my-1.5 prose-p:text-text-primary prose-p:leading-relaxed
                  prose-headings:my-3 prose-headings:text-text-primary prose-headings:font-semibold
                  prose-h2:text-base prose-h3:text-sm
                  prose-li:my-0.5 prose-li:text-text-primary prose-li:leading-relaxed
                  prose-ul:my-1.5 prose-ol:my-1.5
                  prose-strong:text-text-primary prose-strong:font-semibold
                  prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                  prose-code:text-accent prose-code:bg-bg-tertiary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-bg-tertiary prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:text-xs prose-pre:my-3
                  prose-table:w-full prose-table:my-3 prose-table:text-xs prose-table:border-collapse
                  prose-thead:border-b prose-thead:border-border
                  prose-th:bg-bg-tertiary prose-th:text-text-primary prose-th:font-semibold prose-th:px-3 prose-th:py-2 prose-th:text-left
                  prose-td:text-text-secondary prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-border
                  prose-tr:border-b prose-tr:border-border
                  prose-blockquote:border-l-2 prose-blockquote:border-accent prose-blockquote:pl-4 prose-blockquote:text-text-secondary prose-blockquote:italic
                  prose-hr:border-border prose-hr:my-4
                ">
                   <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.showJurisdiction && msg.jurisdictionText ? msg.jurisdictionText : msg.showActionPlan && msg.actionPlanText ? msg.actionPlanText : msg.showSimplified && msg.simplifiedText ? msg.simplifiedText : msg.text}</ReactMarkdown>
                </div>

                {msg.isLoading && (
                    <div className="flex gap-1.5 mt-2">
                        <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                )}
                {msg.isSimplifying && (
                    <div className="flex items-center gap-2 mt-2 text-accent text-xs">
                        <LoaderIcon className="w-3 h-3" />
                        <span>Simplifying...</span>
                    </div>
                )}
                {msg.isGeneratingPlan && (
                    <div className="flex items-center gap-2 mt-2 text-emerald-400 text-xs">
                        <LoaderIcon className="w-3 h-3" />
                        <span>Building action plan...</span>
                    </div>
                )}
                {msg.isGeneratingJurisdiction && (
                    <div className="flex items-center gap-2 mt-2 text-violet-400 text-xs">
                        <LoaderIcon className="w-3 h-3" />
                        <span>Finding jurisdiction...</span>
                    </div>
                )}

                {/* Error retry button */}
                {msg.isError && (
                  <button onClick={() => handleRetry(msg.id)} className="flex items-center gap-1.5 mt-3 px-3 py-1.5 text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all">
                    <RefreshIcon className="w-3.5 h-3.5" />
                    Retry
                  </button>
                )}

                {/* Action buttons — only on completed AI messages */}
                {msg.role === MessageRole.Model && !msg.isLoading && !msg.isError && msg.text && msg.id !== 'welcome' && (
                  <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border flex-wrap">
                    <button
                      onClick={() => handleCopy(msg.id, msg.showJurisdiction && msg.jurisdictionText ? msg.jurisdictionText : msg.showActionPlan && msg.actionPlanText ? msg.actionPlanText : msg.showSimplified && msg.simplifiedText ? msg.simplifiedText : msg.text)}
                      className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors group"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <><CheckIcon className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                      ) : (
                        <><CopyIcon className="w-3.5 h-3.5 group-hover:text-text-secondary transition-colors" /><span>Copy</span></>
                      )}
                    </button>
                    {!msg.simplifiedText && (
                      <button
                        onClick={() => handleSimplify(msg.id)}
                        disabled={msg.isSimplifying}
                        className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-accent transition-colors disabled:opacity-40 group"
                      >
                        <WandIcon className="w-3.5 h-3.5 group-hover:text-accent transition-colors" />
                        <span>Explain like I'm 10</span>
                      </button>
                    )}
                    {!msg.actionPlanText && (
                      <button
                        onClick={() => handleActionPlan(msg.id)}
                        disabled={msg.isGeneratingPlan}
                        className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-emerald-400 transition-colors disabled:opacity-40 group"
                      >
                        <ClipboardListIcon className="w-3.5 h-3.5 group-hover:text-emerald-400 transition-colors" />
                        <span>What should I do?</span>
                      </button>
                    )}
                    {!msg.jurisdictionText && (
                      <button
                        onClick={() => handleJurisdiction(msg.id)}
                        disabled={msg.isGeneratingJurisdiction}
                        className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-violet-400 transition-colors disabled:opacity-40 group"
                      >
                        <CompassIcon className="w-3.5 h-3.5 group-hover:text-violet-400 transition-colors" />
                        <span>Where to file?</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Timestamp */}
                <div className={`text-[10px] mt-2 ${msg.isError ? 'text-red-400/50' : 'text-text-muted'}`}>
                  {timeAgo(msg.timestamp)}
                </div>
              </div>
            </div>
            );
          })}
          <div ref={messagesEndRef} />

          {/* Categorized suggestions on first load */}
          {messages.length === 1 && (
            <div className="mt-6 animate-slide-up">
              <p className="text-xs font-medium text-text-tertiary mb-3 text-center">Try asking about...</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUGGESTED_QUERIES.map((cat, ci) => (
                  <div key={ci} className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider pl-1">{cat.category}</span>
                    {cat.queries.map((q, qi) => (
                      <button key={qi} onClick={() => handleSend(q)} className="w-full text-left px-3.5 py-2.5 text-xs font-medium bg-bg-secondary border border-border rounded-lg text-text-secondary hover:bg-bg-tertiary hover:text-text-primary hover:border-border-light transition-all">
                        {q}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll-to-bottom pill */}
      {showScrollBtn && (
        <button onClick={scrollToBottom} className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-2 bg-accent text-bg text-xs font-semibold rounded-full shadow-lg hover:bg-accent-hover transition-all z-20 animate-fade-in">
          <ArrowDownIcon className="w-3.5 h-3.5" />
          New messages
        </button>
      )}

      {/* Input */}
      <div className="p-4 bg-bg border-t border-border">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2 bg-bg-secondary border border-border rounded-xl p-1.5 focus-within:border-accent/50 focus-within:ring-1 focus-within:ring-accent/20 transition-all">
            {/* Mic Button */}
            <button
              onClick={toggleListening}
              className={`p-2.5 rounded-lg transition-all flex-shrink-0 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-text-tertiary hover:bg-bg-tertiary hover:text-text-secondary'
              }`}
              title={isListening ? 'Stop listening' : `Speak in ${language.label}`}
            >
              {isListening ? <MicOffIcon className="w-4 h-4" /> : <MicIcon className="w-4 h-4" />}
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                  if(e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                  }
              }}
              placeholder={isListening ? `Listening in ${language.label}...` : "Ask about Indian laws, procedures, or legal terms..."}
              className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm text-text-primary placeholder-text-muted p-2"
              rows={1}
              style={{ maxHeight: '160px', overflow: 'auto' }}
            />
            {/* Character count */}
            {charCount > 0 && (
              <span className={`absolute bottom-1 right-24 text-[10px] tabular-nums ${charCount > 4000 ? 'text-red-400' : 'text-text-muted'}`}>
                {charCount.toLocaleString()}
              </span>
            )}
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="p-2.5 bg-accent text-bg rounded-lg hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              {isLoading ? <LoaderIcon className="w-4 h-4" /> : <SendIcon className="w-4 h-4" />}
            </button>
            {isLoading && (
              <button
                onClick={handleStop}
                className="p-2.5 bg-red-500/80 text-white rounded-lg hover:bg-red-500 transition-all flex-shrink-0"
                title="Stop generating"
              >
                <StopCircleIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-center text-[10px] text-text-muted mt-2">
              AI can make mistakes. Always consult a qualified advocate.
          </p>
        </div>
      </div>
    </div>
  );
};