import React, { useState, useCallback } from 'react';
import { MapPinIcon } from './Icons';

// ── Types ──────────────────────────────────────────────────────────
interface LocationCoords {
  lat: number;
  lng: number;
}

type HelpCategory = 'police' | 'court' | 'legalaid' | 'women' | 'consumer' | 'notary';

interface CategoryInfo {
  id: HelpCategory;
  label: string;
  googleQuery: string;
  icon: string;
  description: string;
  helpline?: string;
}

// ── Category Data ──────────────────────────────────────────────────
const CATEGORIES: CategoryInfo[] = [
  {
    id: 'police',
    label: 'Police Station',
    googleQuery: 'police station',
    icon: '🚔',
    description: 'File FIR, lodge complaints, or report cognizable offences.',
    helpline: '100 / 112',
  },
  {
    id: 'court',
    label: 'District Court',
    googleQuery: 'district court',
    icon: '⚖️',
    description: 'Civil suits, criminal trials, family matters, and bail applications.',
  },
  {
    id: 'legalaid',
    label: 'Free Legal Aid (DLSA)',
    googleQuery: 'district legal services authority',
    icon: '🏛️',
    description: 'Free legal assistance under the Legal Services Authorities Act, 1987.',
    helpline: '15100 (Tele-Law)',
  },
  {
    id: 'women',
    label: 'Women Helpdesk / NCW',
    googleQuery: 'women helpdesk police OR women commission office',
    icon: '👩‍⚖️',
    description: 'Domestic violence, dowry harassment, workplace harassment complaints.',
    helpline: '181 (Women Helpline)',
  },
  {
    id: 'consumer',
    label: 'Consumer Forum',
    googleQuery: 'consumer disputes redressal forum',
    icon: '🛒',
    description: 'Complaints about defective goods, deficient services, or unfair trade.',
    helpline: '1800-11-4000 (NCH)',
  },
  {
    id: 'notary',
    label: 'Notary / Stamp Office',
    googleQuery: 'notary office OR sub-registrar office',
    icon: '📝',
    description: 'Affidavits, notarizations, stamp duty, and property registrations.',
  },
];

// ── Main Component ─────────────────────────────────────────────────
export const FindHelp: React.FC = () => {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);
  const [manualCity, setManualCity] = useState('');

  // Get user location
  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser. Please enter your city manually.');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Location permission denied. Please allow location access or enter your city manually.',
          2: 'Could not determine your location. On macOS, enable Location Services in System Settings → Privacy & Security → Location Services, and allow your browser. Or simply type your city below.',
          3: 'Location request timed out. Please try again or enter your city below.',
        };
        setError(messages[err.code] || 'Unable to get location.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Build Google Maps search URL
  const buildMapUrl = (cat: CategoryInfo): string => {
    if (location) {
      return `https://www.google.com/maps/search/${encodeURIComponent(cat.googleQuery)}/@${location.lat},${location.lng},14z`;
    }
    if (manualCity.trim()) {
      return `https://www.google.com/maps/search/${encodeURIComponent(cat.googleQuery + ' in ' + manualCity.trim())}`;
    }
    return `https://www.google.com/maps/search/${encodeURIComponent(cat.googleQuery + ' near me')}`;
  };

  // Build directions URL
  const buildDirectionsUrl = (cat: CategoryInfo): string => {
    const dest = encodeURIComponent(cat.googleQuery + (manualCity.trim() && !location ? ' in ' + manualCity.trim() : ''));
    if (location) {
      return `https://www.google.com/maps/dir/${location.lat},${location.lng}/${dest}`;
    }
    return `https://www.google.com/maps/dir//${dest}`;
  };

  const selectedCat = CATEGORIES.find((c) => c.id === selectedCategory);
  const hasLocation = !!location || manualCity.trim().length > 0;

  return (
    <div className="h-full overflow-y-auto bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/15 rounded-xl flex items-center justify-center">
              <MapPinIcon className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary tracking-tight">Find Help Near Me</h1>
              <p className="text-sm text-text-secondary">Locate courts, police stations, legal aid & more</p>
            </div>
          </div>
        </div>

        {/* ── Step 1: Location ──────────────────────────────────────── */}
        <section className="bg-bg-secondary rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-accent text-bg text-xs font-bold rounded-full flex items-center justify-center">1</span>
            <h2 className="text-sm font-semibold text-text-primary">Set Your Location</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* GPS button */}
            <button
              onClick={handleLocate}
              disabled={locating}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-bg rounded-lg text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {locating ? (
                <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
              ) : (
                <MapPinIcon className="w-4 h-4" />
              )}
              {locating ? 'Detecting…' : 'Use My Location'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-2 text-text-quaternary text-xs font-medium">
              <div className="h-px bg-border flex-1 sm:w-6 sm:flex-none" />
              OR
              <div className="h-px bg-border flex-1 sm:w-6 sm:flex-none" />
            </div>

            {/* Manual city input */}
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={manualCity}
                onChange={(e) => { setManualCity(e.target.value); setLocation(null); }}
                placeholder="Enter city, e.g. Jaipur"
                className="flex-1 px-4 py-2.5 bg-bg-tertiary text-text-primary text-sm rounded-lg border border-border focus:border-accent focus:outline-none placeholder:text-text-quaternary transition-colors"
              />
            </div>
          </div>

          {/* Status badges */}
          {location && (
            <div className="flex items-center gap-2 text-xs text-green-400">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Location detected — GPS coordinates locked
            </div>
          )}
          {manualCity.trim() && !location && (
            <div className="flex items-center gap-2 text-xs text-accent">
              <span className="w-1.5 h-1.5 bg-accent rounded-full" />
              Searching near: {manualCity.trim()}
            </div>
          )}
          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
          )}
        </section>

        {/* ── Step 2: Category ─────────────────────────────────────── */}
        <section className="bg-bg-secondary rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-accent text-bg text-xs font-bold rounded-full flex items-center justify-center">2</span>
            <h2 className="text-sm font-semibold text-text-primary">What Do You Need?</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(active ? null : cat.id)}
                  className={`flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-all border ${
                    active
                      ? 'bg-accent/10 border-accent text-text-primary'
                      : 'bg-bg-tertiary border-border hover:border-border-light text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-xs font-semibold leading-tight">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Step 3: Results Panel ────────────────────────────────── */}
        {selectedCat && (
          <section className="bg-bg-secondary rounded-xl border border-border overflow-hidden animate-slide-up">
            {/* Category header */}
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedCat.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{selectedCat.label}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">{selectedCat.description}</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Helpline badge */}
              {selectedCat.helpline && (
                <div className="flex items-center gap-2 px-4 py-3 bg-accent/10 rounded-lg border border-accent/20">
                  <span className="text-accent text-lg">📞</span>
                  <div>
                    <p className="text-xs text-text-secondary">Emergency / Helpline</p>
                    <p className="text-sm font-semibold text-accent tracking-wide">{selectedCat.helpline}</p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={buildMapUrl(selectedCat)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-accent hover:bg-accent-hover text-bg rounded-lg text-sm font-medium transition-all active:scale-[0.97]"
                >
                  <MapPinIcon className="w-4 h-4" />
                  {hasLocation ? 'Show on Map' : 'Search Near Me'}
                </a>
                <a
                  href={buildDirectionsUrl(selectedCat)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-bg-tertiary hover:bg-bg-elevated text-text-primary rounded-lg text-sm font-medium border border-border transition-all active:scale-[0.97]"
                >
                  <NavigationIcon className="w-4 h-4" />
                  Get Directions
                </a>
              </div>

              {!hasLocation && (
                <p className="text-xs text-text-quaternary text-center">
                  Tip: Set your location above for more accurate results.
                </p>
              )}

              {/* Quick Legal Info Cards */}
              <div className="mt-2 space-y-3">
                <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Quick Info</h4>
                {selectedCat.id === 'police' && (
                  <QuickInfoCards items={[
                    { title: 'Zero FIR', text: 'You can file an FIR at ANY police station regardless of jurisdiction (Sec 173 BNSS). They must register it.' },
                    { title: 'E-FIR', text: 'Most states allow online FIR filing at their police portal or via the CCTNS app.' },
                    { title: 'Right to Receipt', text: 'On filing an FIR you are entitled to a free copy immediately (Sec 154 CrPC / Sec 173 BNSS).' },
                  ]} />
                )}
                {selectedCat.id === 'court' && (
                  <QuickInfoCards items={[
                    { title: 'eFiling', text: 'File cases online at efiling.ecourts.gov.in — available for most District & High Courts.' },
                    { title: 'Case Status', text: 'Track any case at services.ecourts.gov.in using CNR number, party name, or FIR number.' },
                    { title: 'Court Fees', text: 'Court fees vary by state and suit type. Use the Calculators section in Legal AI to estimate.' },
                  ]} />
                )}
                {selectedCat.id === 'legalaid' && (
                  <QuickInfoCards items={[
                    { title: 'Who Qualifies?', text: 'SC/ST, women, children, persons with disabilities, industrial workers, persons in custody, and those with annual income < ₹3 lakh (≤₹9 lakh in Supreme Court).' },
                    { title: 'Tele-Law', text: 'Free video consultations with lawyers via Common Service Centres (CSCs). Call 15100.' },
                    { title: 'Lok Adalat', text: 'Disputes can be settled for free in Lok Adalats — no court fee, no appeal, and legally binding.' },
                  ]} />
                )}
                {selectedCat.id === 'women' && (
                  <QuickInfoCards items={[
                    { title: 'DV Act Protection', text: 'Under the Protection of Women from Domestic Violence Act, 2005 you can seek protection, residence, and monetary relief orders.' },
                    { title: 'One Stop Centre', text: 'Sakhi Centres provide integrated support (police, legal, medical, shelter) — call 181.' },
                    { title: 'Online Complaint', text: 'File complaints at ncw.nic.in (NCW) or the She-Box portal (Internal Complaints Committee for workplace harassment).' },
                  ]} />
                )}
                {selectedCat.id === 'consumer' && (
                  <QuickInfoCards items={[
                    { title: 'Online Filing', text: 'File complaints at edaakhil.nic.in — the official e-filing portal for consumer cases.' },
                    { title: 'Jurisdiction', text: 'District Forum (up to ₹1 Cr), State Commission (₹1–10 Cr), National Commission (> ₹10 Cr).' },
                    { title: 'No Lawyer Needed', text: 'You can argue your consumer complaint yourself — no advocate is mandatory.' },
                  ]} />
                )}
                {selectedCat.id === 'notary' && (
                  <QuickInfoCards items={[
                    { title: 'e-Stamp', text: 'Many states support e-Stamp paper via SHCIL (shcilestamp.com) — no need to visit a stamp vendor.' },
                    { title: 'Registration', text: 'Property docs must be registered at the Sub-Registrar office within 4 months of execution (Sec 23, Registration Act).' },
                    { title: 'Affidavit', text: 'Affidavits can be sworn before a Notary Public or a Magistrate on ₹10 stamp paper (varies by state).' },
                  ]} />
                )}
              </div>
            </div>
          </section>
        )}

        {/* Disclaimer */}
        <div className="px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400/80 leading-relaxed">
          <strong>Disclaimer:</strong> "Find Help Near Me" uses Google Maps to surface publicly listed results. Verify office hours and jurisdiction before visiting. In emergencies, dial <strong>112</strong>.
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────
const NavigationIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
);

const QuickInfoCards: React.FC<{ items: { title: string; text: string }[] }> = ({ items }) => (
  <div className="space-y-2">
    {items.map((item, i) => (
      <div key={i} className="p-3 bg-bg-tertiary rounded-lg border border-border">
        <p className="text-xs font-semibold text-text-primary mb-0.5">{item.title}</p>
        <p className="text-xs text-text-secondary leading-relaxed">{item.text}</p>
      </div>
    ))}
  </div>
);
