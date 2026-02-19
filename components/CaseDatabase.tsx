import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CaseIndex, CaseIndexEntry } from '../types';
import { LoaderIcon, ArrowRightIcon } from './Icons';

// ── Category Definitions ───────────────────────────────────────────
const CATEGORIES = [
  { id: 'all', label: 'All Cases', icon: '📚', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'judgement', label: 'Judgments', icon: '⚖️', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { id: 'order', label: 'Orders', icon: '📋', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
];

const YEAR_RANGES = [
  { id: 'all', label: 'All Years' },
  { id: '2024-2026', label: '2024–2026', min: 2024, max: 2026 },
  { id: '2020-2023', label: '2020–2023', min: 2020, max: 2023 },
  { id: '2015-2019', label: '2015–2019', min: 2015, max: 2019 },
  { id: '2010-2014', label: '2010–2014', min: 2010, max: 2014 },
  { id: '2000-2009', label: '2000–2009', min: 2000, max: 2009 },
  { id: '1950-1999', label: '1950–1999', min: 1950, max: 1999 },
];

const ITEMS_PER_PAGE = 50;

// ── DatabaseIcon (inline) ──────────────────────────────────────────
const DatabaseIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M3 5V19A9 3 0 0 0 21 19V5"/>
    <path d="M3 12A9 3 0 0 0 21 12"/>
  </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
);

const FilterIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);

export const CaseDatabase = () => {
  const [index, setIndex] = useState<CaseIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedYearRange, setSelectedYearRange] = useState('all');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [showFilters, setShowFilters] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load the index
  useEffect(() => {
    const loadIndex = async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}cases.json`);
        const data = await res.json();
        setIndex(data);
      } catch (err) {
        console.error('Failed to load case index:', err);
      } finally {
        setLoading(false);
      }
    };
    loadIndex();
  }, []);

  // Filter cases
  const filteredCases = useMemo(() => {
    if (!index) return [];

    let cases = index.cases.filter(c => !c.isVernacular);

    // Category filter
    if (selectedCategory !== 'all') {
      cases = cases.filter(c => c.type?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Year range filter
    if (selectedYearRange !== 'all') {
      const range = YEAR_RANGES.find(r => r.id === selectedYearRange);
      if (range && 'min' in range) {
        cases = cases.filter(c => c.year && c.year >= range.min! && c.year <= range.max!);
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      cases = cases.filter(c =>
        c.id.toLowerCase().includes(q) ||
        c.caseNo.toLowerCase().includes(q) ||
        (c.year && c.year.toString().includes(q)) ||
        c.filename.toLowerCase().includes(q)
      );
    }

    return cases;
  }, [index, selectedCategory, selectedYearRange, searchQuery]);

  // Visible slice for rendering
  const visibleCases = useMemo(() => {
    return filteredCases.slice(0, visibleCount);
  }, [filteredCases, visibleCount]);

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredCases.length) {
          setVisibleCount(prev => prev + ITEMS_PER_PAGE);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [visibleCount, filteredCases.length]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [selectedCategory, selectedYearRange, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    if (!index) return { total: 0, judgments: 0, orders: 0, years: 0 };
    const nonVernacular = index.cases.filter(c => !c.isVernacular);
    return {
      total: nonVernacular.length,
      judgments: nonVernacular.filter(c => c.type === 'Judgement').length,
      orders: nonVernacular.filter(c => c.type === 'Order').length,
      years: index.years?.length || 0,
    };
  }, [index]);

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <LoaderIcon className="w-8 h-8 text-accent" />
          <p className="text-sm text-text-tertiary">Loading Case Database…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/15 rounded-xl flex items-center justify-center">
              <DatabaseIcon className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary tracking-tight">Judgment Database</h1>
              <p className="text-sm text-text-secondary">Supreme Court of India — AI-Powered Analysis</p>
            </div>
          </div>
        </div>

        {/* ── Stats Bar ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { value: stats.total.toLocaleString(), label: 'Total Cases', color: 'text-blue-400' },
            { value: stats.judgments.toLocaleString(), label: 'Judgments', color: 'text-emerald-400' },
            { value: stats.orders.toLocaleString(), label: 'Orders', color: 'text-amber-400' },
            { value: stats.years.toString(), label: 'Years Covered', color: 'text-violet-400' },
          ].map((s, i) => (
            <div key={i} className="bg-bg-secondary rounded-xl border border-border px-4 py-3 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-text-quaternary mt-0.5 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Search + Filter Bar ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-quaternary" />
            <input
              type="text"
              placeholder="Search by case number, year, or ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary border border-border rounded-xl text-sm text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              showFilters
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'bg-bg-secondary border-border text-text-secondary hover:border-border-light'
            }`}
          >
            <FilterIcon className="w-4 h-4" />
            Filters
            {(selectedCategory !== 'all' || selectedYearRange !== 'all') && (
              <span className="w-2 h-2 bg-accent rounded-full" />
            )}
          </button>
        </div>

        {/* ── Filters Panel ──────────────────────────────────── */}
        {showFilters && (
          <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-4 animate-slide-up">
            {/* Categories */}
            <div>
              <span className="text-[11px] text-text-quaternary uppercase tracking-wider font-semibold mb-2 block">Category</span>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-accent/15 border-accent/30 text-accent'
                        : `${cat.color} hover:opacity-80`
                    }`}
                  >
                    <span>{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Year Ranges */}
            <div>
              <span className="text-[11px] text-text-quaternary uppercase tracking-wider font-semibold mb-2 block">Year Range</span>
              <div className="flex flex-wrap gap-2">
                {YEAR_RANGES.map(range => (
                  <button
                    key={range.id}
                    onClick={() => setSelectedYearRange(range.id)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                      selectedYearRange === range.id
                        ? 'bg-accent/15 border-accent/30 text-accent'
                        : 'bg-bg-tertiary border-border text-text-secondary hover:border-border-light'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {(selectedCategory !== 'all' || selectedYearRange !== 'all') && (
              <button
                onClick={() => { setSelectedCategory('all'); setSelectedYearRange('all'); }}
                className="text-[12px] text-red-400 hover:text-red-300 font-medium transition-colors"
              >
                ✕ Clear all filters
              </button>
            )}
          </div>
        )}

        {/* ── Results Summary ────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-text-tertiary">
            Showing <span className="text-text-primary font-semibold">{Math.min(visibleCount, filteredCases.length).toLocaleString()}</span> of{' '}
            <span className="text-text-primary font-semibold">{filteredCases.length.toLocaleString()}</span> cases
          </p>
        </div>

        {/* ── Case List ──────────────────────────────────────── */}
        <div className="space-y-2">
          {visibleCases.map((caseItem, i) => (
            <Link
              key={caseItem.id}
              to={`/judgments/${encodeURIComponent(caseItem.id)}`}
              className="block bg-bg-secondary rounded-xl border border-border p-4 hover:border-accent/30 hover:bg-accent/[0.02] transition-all group animate-slide-up"
              style={{ animationDelay: `${Math.min(i, 20) * 0.02}s` }}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  caseItem.type === 'Order'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  <span className="text-sm">{caseItem.type === 'Order' ? '📋' : '⚖️'}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                      Case No. {caseItem.caseNo}
                      {caseItem.year && <span className="text-text-tertiary font-normal"> / {caseItem.year}</span>}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      caseItem.type === 'Order'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {caseItem.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[12px] text-text-quaternary">
                    <span>🏛️ {caseItem.court}</span>
                    {caseItem.date && <span>📅 {caseItem.date}</span>}
                    <span className="text-[10px] text-text-quaternary/50 truncate max-w-[200px]">
                      {caseItem.source === 'judis' ? 'JUDIS Archive' : 'SCI Portal'}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRightIcon className="w-4 h-4 text-text-quaternary group-hover:text-accent shrink-0 transition-colors" />
              </div>
            </Link>
          ))}

          {/* Load more trigger */}
          {visibleCount < filteredCases.length && (
            <div ref={loadMoreRef} className="flex justify-center py-6">
              <LoaderIcon className="w-5 h-5 text-accent" />
            </div>
          )}

          {/* Empty State */}
          {filteredCases.length === 0 && !loading && (
            <div className="text-center py-16">
              <span className="text-4xl block mb-3">🔍</span>
              <h3 className="text-base font-semibold text-text-primary mb-1">No cases found</h3>
              <p className="text-sm text-text-tertiary">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>

        {/* ── Info Footer ────────────────────────────────────── */}
        <div className="px-5 py-3 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-start gap-2.5">
          <span className="text-base mt-0.5">💡</span>
          <div className="text-[12px] text-blue-400/80 leading-relaxed">
            <strong className="text-blue-400">How it works:</strong> Click any case to read the full PDF and get an AI-powered analysis including summary, key statutes, citation network, case flow, and judge details — all extracted automatically.
          </div>
        </div>
      </div>
    </div>
  );
};
