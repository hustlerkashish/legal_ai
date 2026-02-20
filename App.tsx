import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { ChatInterface } from './components/ChatInterface';
import { DocumentAnalyzer } from './components/DocumentAnalyzer';
import { Architecture } from './components/Architecture';
import { Calculators } from './components/Calculators';
import { FindHelp } from './components/FindHelp';
import { ScamCheck } from './components/ScamCheck';
import { SnapSolve } from './components/SnapSolve';
import { LegalFlow } from './components/LegalFlow';
import { CaseStudies } from './components/CaseStudies';
import { CaseDatabase } from './components/CaseDatabase';
import { JudgmentAnalyzer } from './components/JudgmentAnalyzer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { ForgotPassword } from './components/ForgotPassword';
import { ScaleIcon, BookOpenIcon, FileTextIcon, MenuIcon, NetworkIcon, ArrowRightIcon, SparklesIcon, ShieldIcon, XIcon, CalculatorIcon, MapPinIcon, CameraScanIcon, FlowchartIcon, CaseStudyIcon, LogOutIcon, DatabaseIcon } from './components/Icons';
import { useAuth } from './contexts/AuthContext';
import { logout } from './services/authService';

// ── Welcome Splash Screen ──────────────────────────────────────────
const WelcomeScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [phase, setPhase] = useState<'typing' | 'subtitle' | 'exit'>('typing');
  const [displayText, setDisplayText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const fullText = 'Legal AI';

  // Typewriter effect
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
        setTimeout(() => setPhase('subtitle'), 400);
      }
    }, 120);
    return () => clearInterval(interval);
  }, []);

  // Blinking cursor
  useEffect(() => {
    const blink = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(blink);
  }, []);

  // Auto-dismiss after subtitle shows
  useEffect(() => {
    if (phase === 'subtitle') {
      const timer = setTimeout(() => setPhase('exit'), 2000);
      return () => clearTimeout(timer);
    }
    if (phase === 'exit') {
      const timer = setTimeout(onFinish, 700);
      return () => clearTimeout(timer);
    }
  }, [phase, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-bg flex flex-col items-center justify-center welcome-container transition-opacity duration-700 ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={() => { setPhase('exit'); }}
    >
      {/* Subtle animated glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none gpu">
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-[120px] welcome-pulse" />
      </div>

      <div className="relative flex flex-col items-center gap-6 gpu">
        {/* Icon */}
        <div className={`w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center welcome-fade-element transition-transform duration-700 ${
          phase === 'typing' ? 'scale-100' : 'scale-110'
        }`}>
          <ScaleIcon className="text-accent w-8 h-8" />
        </div>

        {/* Typed heading */}
        <h1 className="text-5xl md:text-7xl font-bold text-text-primary tracking-tight leading-none gpu">
          <span className="welcome-gradient-text">{displayText}</span>
          <span className={`welcome-cursor inline-block w-[3px] h-[0.85em] bg-accent ml-1 align-baseline rounded-sm transition-opacity duration-100 ${
            cursorVisible ? 'opacity-100' : 'opacity-0'
          }`} />
        </h1>

        {/* Subtitle — fades in after typing */}
        <p className={`text-base md:text-lg text-text-secondary font-light tracking-wide welcome-fade-element transition-all duration-700 ${
          phase === 'typing' ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
        }`}>
          Your AI-powered Indian legal companion
        </p>

        {/* Enter hint */}
        <button
          onClick={() => setPhase('exit')}
          className={`mt-8 px-6 py-2.5 bg-bg-secondary border border-border rounded-full text-xs text-text-tertiary hover:text-text-primary hover:border-border-light welcome-fade-element transition-all duration-500 ${
            phase === 'typing' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
        >
          Click anywhere to continue →
        </button>
      </div>
    </div>
  );
};

const Sidebar = ({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const navItems = [
    { path: '/', label: 'Home', icon: <ScaleIcon /> },
    { path: '/chat', label: 'AI Legal Chat', icon: <BookOpenIcon /> },
    { path: '/analyzer', label: 'Doc Analyzer', icon: <FileTextIcon /> },
    { path: '/snap-solve', label: 'Snap & Solve', icon: <CameraScanIcon /> },
    { path: '/calculators', label: 'Calculators', icon: <CalculatorIcon /> },
    { path: '/find-help', label: 'Find Help Near Me', icon: <MapPinIcon /> },
    { path: '/scam-check', label: 'Scam Check', icon: <ShieldIcon /> },
    { path: '/legal-flow', label: 'Legal-Flow', icon: <FlowchartIcon /> },
    { path: '/judgments', label: 'Judgment DB', icon: <DatabaseIcon /> },
    { path: '/case-studies', label: 'Case Studies', icon: <CaseStudyIcon /> },
    { path: '/architecture', label: 'About', icon: <NetworkIcon /> },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-30 h-full w-[240px] transition-transform duration-300 ease-in-out
        bg-bg border-r border-border flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-between shrink-0">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <ScaleIcon className="text-bg w-4 h-4" />
            </div>
            <h1 className="font-semibold text-base text-text-primary tracking-tight leading-none">Legal AI</h1>
          </Link>
          <button onClick={() => setIsOpen(false)} className="md:hidden p-1 text-text-tertiary hover:text-text-primary">
            <XIcon />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 mt-1 flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 ${
                    isActive 
                      ? 'bg-bg-tertiary text-text-primary font-medium' 
                      : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                  }`}
                >
                  <span className={`w-4.5 h-4.5 ${isActive ? 'text-accent' : 'text-text-tertiary'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        {user && (
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-bg">
            <p className="text-xs text-text-tertiary truncate px-2 mb-2" title={user.email ?? undefined}>
              {user.displayName || user.email}
            </p>
            <button
              onClick={() => logout().then(() => navigate('/login'))}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
            >
              <LogOutIcon className="w-4 h-4" />
              Log out
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

const LandingPage = () => {
    return (
        <div className="h-full overflow-y-auto overflow-x-hidden bg-bg">
            {/* ── Hero ── */}
            <div className="relative min-h-[75vh] flex items-center justify-center px-6 py-24 overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.04] blur-[140px] gpu" />
                    <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/[0.03] blur-[120px] gpu" />
                </div>

                <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in relative z-10">
                    {/* Heading */}
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-text-primary leading-[1.05] tracking-tight">
                        Understand Indian Law,<br/>
                        <span className="text-accent">Simply.</span>
                    </h1>

                    {/* Subtext */}
                    <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed font-light">
                        Instant legal answers, document analysis, smart calculators, scam detection, and case studies — all in one AI-powered platform.
                    </p>
                    
                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                        <Link to="/chat" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-bg rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:shadow-accent/20 active:scale-[0.97] gpu">
                            <BookOpenIcon className="w-4 h-4" /> Start Legal Chat
                            <ArrowRightIcon className="w-4 h-4 ml-1" />
                        </Link>
                        <Link to="/analyzer" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-bg-secondary hover:bg-bg-tertiary text-text-primary rounded-xl font-semibold text-sm border border-border hover:border-border-light transition-all active:scale-[0.97] gpu">
                            <FileTextIcon className="w-4 h-4" /> Analyze a Document
                        </Link>
                    </div>

                    {/* Language strip */}
                    <div className="pt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] text-text-quaternary">
                        <span className="text-text-tertiary font-medium">Available in:</span>
                        {['English', 'हिन्दी', 'বাংলা', 'தமிழ்', 'తెలుగు', 'मराठी', 'ગુજરાતી', 'ಕನ್ನಡ', 'മലയാളം', 'ਪੰਜਾਬੀ', 'اردو'].map((l, i) => (
                            <span key={i} className="hover:text-text-secondary transition-colors">{l}{i < 10 ? ' ·' : ''}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Stats Bar ── */}
            <div className="border-y border-border bg-bg-secondary/50">
                <div className="max-w-5xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    {[
                        { value: '10+', label: 'Legal Tools' },
                        { value: '11', label: 'Languages' },
                        { value: '100%', label: 'Free to Use' },
                        { value: 'Zero', label: 'Data Stored' },
                    ].map((s, i) => (
                        <div key={i} className="animate-slide-up gpu" style={{ animationDelay: `${i * 0.08}s` }}>
                            <div className="text-2xl font-bold text-accent">{s.value}</div>
                            <div className="text-xs text-text-tertiary mt-0.5 font-medium">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── All Features Grid ── */}
            <div className="max-w-5xl mx-auto px-6 py-16">
                <div className="text-center mb-10">
                    <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Everything you need, in one place</h2>
                    <p className="text-sm text-text-tertiary mt-2 max-w-lg mx-auto">Nine purpose-built tools to help you navigate Indian law — from quick answers to deep case analysis.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { to: '/chat', icon: <BookOpenIcon className="w-5 h-5" />, title: 'AI Legal Chat', desc: 'Ask any legal question and get structured answers with citations from IPC, BNS, Constitution & more.', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                        { to: '/analyzer', icon: <FileTextIcon className="w-5 h-5" />, title: 'Doc Analyzer', desc: 'Upload legal documents — FIRs, contracts, notices — and get a plain-language risk summary.', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                        { to: '/snap-solve', icon: <CameraScanIcon className="w-5 h-5" />, title: 'Snap & Solve', desc: 'Take a photo of any legal document and get an instant AI-powered explanation.', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
                        { to: '/calculators', icon: <CalculatorIcon className="w-5 h-5" />, title: 'Smart Calculators', desc: 'Court fees, interest, gratuity, maintenance & bail surety — calculated instantly.', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                        { to: '/find-help', icon: <MapPinIcon className="w-5 h-5" />, title: 'Find Help Near Me', desc: 'Locate nearby courts, police stations, legal aid, women helplines & consumer forums.', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
                        { to: '/scam-check', icon: <ShieldIcon className="w-5 h-5" />, title: 'Scam Check', desc: 'Paste suspicious messages — get instant forensic analysis with IT Act citations.', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
                        { to: '/legal-flow', icon: <FlowchartIcon className="w-5 h-5" />, title: 'Legal-Flow', desc: 'Get visual step-by-step flowcharts for any legal process — filing FIR to filing PIL.', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
                        { to: '/case-studies', icon: <CaseStudyIcon className="w-5 h-5" />, title: 'Case Studies', desc: 'Deep-dive into landmark cases with animated visual stories, charts & Mermaid diagrams.', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
                        { to: '/judgments', icon: <DatabaseIcon className="w-5 h-5" />, title: 'Judgment Database', desc: 'Browse 46,000+ Supreme Court judgments. AI-powered summary, statutes, citations & case flow.', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
                        { to: '/architecture', icon: <NetworkIcon className="w-5 h-5" />, title: 'About', desc: 'Meet CodeX — team, tech stack, and how Legal AI works under the hood.', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
                    ].map((f, i) => (
                        <Link
                            key={i}
                            to={f.to}
                            className="group bg-bg-secondary p-5 rounded-xl border border-border hover:border-border-light transition-all animate-slide-up gpu hover:translate-y-[-2px] hover:shadow-lg hover:shadow-black/20"
                            style={{ animationDelay: `${i * 0.06}s` }}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 border ${f.color} transition-transform group-hover:scale-110`}>
                                {f.icon}
                            </div>
                            <h3 className="text-sm font-semibold text-text-primary mb-1 group-hover:text-accent transition-colors">{f.title}</h3>
                            <p className="text-[13px] text-text-tertiary leading-relaxed">{f.desc}</p>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── How It Works ── */}
            <div className="bg-bg-secondary/40 border-y border-border">
                <div className="max-w-4xl mx-auto px-6 py-16">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">How it works</h2>
                        <p className="text-sm text-text-tertiary mt-2">Three steps to legal clarity</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { step: '01', title: 'Ask or Upload', desc: 'Type your legal question in any of 11 languages, or upload/photograph a document.', icon: '💬' },
                            { step: '02', title: 'AI Analyzes', desc: 'Gemini AI processes your query using deep Indian law knowledge — IPC, BNS, Constitution & more.', icon: '🧠' },
                            { step: '03', title: 'Get Answers', desc: 'Receive structured answers with section citations, action plans, flowcharts & simplified explanations.', icon: '✅' },
                        ].map((s, i) => (
                            <div key={i} className="relative text-center animate-slide-up gpu" style={{ animationDelay: `${i * 0.12}s` }}>
                                <div className="text-4xl mb-4">{s.icon}</div>
                                <div className="text-[10px] text-accent font-bold tracking-[0.2em] uppercase mb-2">Step {s.step}</div>
                                <h3 className="text-sm font-semibold text-text-primary mb-1.5">{s.title}</h3>
                                <p className="text-[13px] text-text-tertiary leading-relaxed">{s.desc}</p>
                                {i < 2 && <div className="hidden md:block absolute top-8 -right-3 text-text-quaternary text-lg">→</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Emergency Helplines ── */}
            <div className="max-w-5xl mx-auto px-6 py-14">
                <div className="bg-bg-secondary rounded-2xl border border-border p-6 md:p-8">
                    <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <span className="text-lg">🚨</span> Emergency Helplines
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { name: 'Police', number: '100', color: 'text-red-400' },
                            { name: 'Women Helpline', number: '181', color: 'text-pink-400' },
                            { name: 'Cyber Crime', number: '1930', color: 'text-orange-400' },
                            { name: 'Legal Aid (NALSA)', number: '15100', color: 'text-blue-400' },
                        ].map((h, i) => (
                            <a key={i} href={`tel:${h.number}`} className="flex items-center gap-3 px-4 py-3 bg-bg-tertiary rounded-xl border border-border hover:border-border-light transition-all group">
                                <span className={`text-lg font-bold ${h.color}`}>{h.number}</span>
                                <span className="text-xs text-text-tertiary group-hover:text-text-secondary transition-colors">{h.name}</span>
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <footer className="border-t border-border bg-bg-secondary/30">
                <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
                            <ScaleIcon className="text-bg w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-semibold text-text-primary">Legal AI</span>
                    </div>
                    <p className="text-[11px] text-text-quaternary text-center leading-relaxed max-w-lg">
                        <strong className="text-text-tertiary">Disclaimer:</strong> Legal AI provides AI-generated legal information for educational purposes only. It does not constitute legal advice. Always consult a qualified advocate for specific legal matters.
                    </p>
                </div>
            </footer>
        </div>
    );
}

const AppLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 min-w-0 flex flex-col h-full relative">
        <header className="md:hidden bg-bg border-b border-border px-4 py-3 flex items-center justify-between z-10 shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-1 text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-secondary transition-colors">
            <MenuIcon />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <ScaleIcon className="text-bg w-4 h-4" />
            </div>
            <span className="font-semibold text-text-primary text-sm">Legal AI</span>
          </div>
          <div className="w-10" />
        </header>
        <div className="flex-1 overflow-hidden relative w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const App = () => {
  const [showWelcome, setShowWelcome] = useState(() => {
    if (sessionStorage.getItem('legalai-welcomed')) return false;
    return true;
  });

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    sessionStorage.setItem('legalai-welcomed', '1');
  }, []);

  return (
    <HashRouter>
      {showWelcome && <WelcomeScreen onFinish={dismissWelcome} />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<LandingPage />} />
          <Route path="chat" element={<ChatInterface />} />
          <Route path="analyzer" element={<DocumentAnalyzer />} />
          <Route path="snap-solve" element={<SnapSolve />} />
          <Route path="calculators" element={<Calculators />} />
          <Route path="find-help" element={<FindHelp />} />
          <Route path="scam-check" element={<ScamCheck />} />
          <Route path="legal-flow" element={<LegalFlow />} />
          <Route path="judgments" element={<CaseDatabase />} />
          <Route path="judgments/:caseId" element={<JudgmentAnalyzer />} />
          <Route path="case-studies" element={<CaseStudies />} />
          <Route path="architecture" element={<Architecture />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
