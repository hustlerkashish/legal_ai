import React, { useState } from 'react';
import { CalculatorIcon } from './Icons';

type CalcTab = 'court-fees' | 'interest' | 'gratuity' | 'maintenance' | 'bail-surety';

const CALC_TABS: { id: CalcTab; label: string; desc: string }[] = [
  { id: 'court-fees', label: 'Court Fees', desc: 'Calculate filing fees for civil suits' },
  { id: 'interest', label: 'Late Payment Interest', desc: 'Simple & compound interest on dues' },
  { id: 'gratuity', label: 'Gratuity', desc: 'Employee gratuity under the Payment of Gratuity Act' },
  { id: 'maintenance', label: 'Maintenance', desc: 'Estimate under Sec 125 CrPC / Sec 144 BNSS' },
  { id: 'bail-surety', label: 'Bail Surety', desc: 'Estimate bail bond & surety amount' },
];

// ── Court Fees Calculator ──
const CourtFeesCalc = () => {
  const [suitValue, setSuitValue] = useState('');
  const [courtType, setCourtType] = useState<'district' | 'high-court' | 'supreme-court'>('district');
  const [suitType, setSuitType] = useState<'money' | 'property' | 'injunction' | 'divorce'>('money');
  const [result, setResult] = useState<{ fee: number; breakdown: string } | null>(null);

  const calculate = () => {
    const val = parseFloat(suitValue) || 0;
    let fee = 0;
    let breakdown = '';

    if (suitType === 'divorce' || suitType === 'injunction') {
      const fixedFees = {
        'district': { divorce: 500, injunction: 200 },
        'high-court': { divorce: 1000, injunction: 500 },
        'supreme-court': { divorce: 5000, injunction: 2500 },
      };
      fee = fixedFees[courtType][suitType];
      breakdown = `Fixed court fee for ${suitType} petition in ${courtType.replace('-', ' ')}: ₹${fee.toLocaleString('en-IN')}\n\nNote: Actual fees vary by state. This is an approximate base fee. Additional process fees, stamp duty, and advocate fees apply separately.`;
    } else {
      // Ad valorem fee schedule (approximate general rates)
      if (val <= 100000) {
        fee = val * 0.075;
      } else if (val <= 500000) {
        fee = 7500 + (val - 100000) * 0.05;
      } else if (val <= 1000000) {
        fee = 27500 + (val - 500000) * 0.04;
      } else if (val <= 5000000) {
        fee = 47500 + (val - 1000000) * 0.03;
      } else {
        fee = 167500 + (val - 5000000) * 0.02;
      }

      if (courtType === 'high-court') fee *= 1.25;
      if (courtType === 'supreme-court') fee *= 1.5;
      if (suitType === 'property') fee *= 1.1;

      fee = Math.round(fee);
      breakdown = `Suit value: ₹${val.toLocaleString('en-IN')}\nCourt: ${courtType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}\nType: ${suitType.charAt(0).toUpperCase() + suitType.slice(1)} suit\n\nAd valorem fee: ₹${fee.toLocaleString('en-IN')}\n\n⚠️ Note: Court fees vary significantly by state under respective Court Fees Acts. This is an approximation based on general slab rates. Always verify with the specific court registry.`;
    }

    setResult({ fee, breakdown });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Suit / Claim Value (₹)</label>
          <input type="number" value={suitValue} onChange={e => setSuitValue(e.target.value)} placeholder="e.g. 500000"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Court</label>
          <select value={courtType} onChange={e => setCourtType(e.target.value as any)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-all">
            <option value="district">District Court</option>
            <option value="high-court">High Court</option>
            <option value="supreme-court">Supreme Court</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Suit Type</label>
          <select value={suitType} onChange={e => setSuitType(e.target.value as any)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-all">
            <option value="money">Money Recovery</option>
            <option value="property">Property Dispute</option>
            <option value="injunction">Injunction</option>
            <option value="divorce">Divorce Petition</option>
          </select>
        </div>
      </div>
      <button onClick={calculate} className="w-full py-2.5 bg-accent hover:bg-accent-hover text-bg rounded-lg font-medium text-sm transition-all active:scale-[0.98]">Calculate Court Fees</button>
      {result && (
        <div className="bg-bg rounded-xl border border-border p-5 animate-fade-in">
          <div className="text-center mb-4">
            <p className="text-xs text-text-tertiary mb-1">Estimated Court Fee</p>
            <p className="text-3xl font-bold text-accent">₹{result.fee.toLocaleString('en-IN')}</p>
          </div>
          <pre className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">{result.breakdown}</pre>
        </div>
      )}
    </div>
  );
};

// ── Late Payment Interest Calculator ──
const InterestCalc = () => {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('12');
  const [period, setPeriod] = useState('');
  const [periodUnit, setPeriodUnit] = useState<'months' | 'years'>('months');
  const [interestType, setInterestType] = useState<'simple' | 'compound'>('simple');
  const [result, setResult] = useState<{ interest: number; total: number; breakdown: string } | null>(null);

  const calculate = () => {
    const p = parseFloat(principal) || 0;
    const r = parseFloat(rate) || 0;
    const t = parseFloat(period) || 0;
    const years = periodUnit === 'months' ? t / 12 : t;

    let interest: number;
    let breakdown: string;

    if (interestType === 'simple') {
      interest = p * r * years / 100;
      breakdown = `Simple Interest = P × R × T / 100\n= ₹${p.toLocaleString('en-IN')} × ${r}% × ${years.toFixed(2)} years\n= ₹${Math.round(interest).toLocaleString('en-IN')}`;
    } else {
      const total = p * Math.pow(1 + r / 100, years);
      interest = total - p;
      breakdown = `Compound Interest = P(1 + R/100)^T − P\n= ₹${p.toLocaleString('en-IN')} × (1 + ${r}/100)^${years.toFixed(2)} − ₹${p.toLocaleString('en-IN')}\n= ₹${Math.round(interest).toLocaleString('en-IN')}`;
    }

    interest = Math.round(interest);
    const total = p + interest;
    breakdown += `\n\nPrincipal: ₹${p.toLocaleString('en-IN')}\nInterest: ₹${interest.toLocaleString('en-IN')}\nTotal Due: ₹${total.toLocaleString('en-IN')}\n\n📌 Courts typically award interest at 6-18% p.a. depending on the case. RBI repo rate-based interest is common in commercial disputes.`;

    setResult({ interest, total, breakdown });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Principal Amount (₹)</label>
          <input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="e.g. 100000"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Rate (% per annum)</label>
          <input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="12"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 transition-all" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Interest Type</label>
          <select value={interestType} onChange={e => setInterestType(e.target.value as any)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-all">
            <option value="simple">Simple Interest</option>
            <option value="compound">Compound Interest</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Time Period</label>
          <input type="number" value={period} onChange={e => setPeriod(e.target.value)} placeholder="e.g. 24"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 transition-all" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Period Unit</label>
          <select value={periodUnit} onChange={e => setPeriodUnit(e.target.value as any)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-all">
            <option value="months">Months</option>
            <option value="years">Years</option>
          </select>
        </div>
      </div>
      <button onClick={calculate} className="w-full py-2.5 bg-accent hover:bg-accent-hover text-bg rounded-lg font-medium text-sm transition-all active:scale-[0.98]">Calculate Interest</button>
      {result && (
        <div className="bg-bg rounded-xl border border-border p-5 animate-fade-in">
          <div className="flex justify-center gap-4 sm:gap-8 mb-4">
            <div className="text-center">
              <p className="text-xs text-text-tertiary mb-1">Interest</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-400">₹{result.interest.toLocaleString('en-IN')}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-tertiary mb-1">Total Due</p>
              <p className="text-xl sm:text-2xl font-bold text-accent">₹{result.total.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <pre className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">{result.breakdown}</pre>
        </div>
      )}
    </div>
  );
};

// ── Gratuity Calculator ──
const GratuityCalc = () => {
  const [lastSalary, setLastSalary] = useState('');
  const [yearsOfService, setYearsOfService] = useState('');
  const [employeeType, setEmployeeType] = useState<'covered' | 'not-covered'>('covered');
  const [result, setResult] = useState<{ gratuity: number; breakdown: string } | null>(null);

  const calculate = () => {
    const salary = parseFloat(lastSalary) || 0;
    const years = parseFloat(yearsOfService) || 0;

    if (years < 5) {
      setResult({ gratuity: 0, breakdown: '❌ Minimum 5 years of continuous service required to be eligible for gratuity under the Payment of Gratuity Act, 1972.\n\nException: In case of death or disablement, the 5-year condition is waived.' });
      return;
    }

    let gratuity: number;
    let breakdown: string;

    if (employeeType === 'covered') {
      // Covered under the Act: Gratuity = (15 × Last drawn salary × Years of service) / 26
      gratuity = Math.round((15 * salary * years) / 26);
      breakdown = `Formula (Covered under Act):\nGratuity = (15 × Last Drawn Salary × Years) / 26\n= (15 × ₹${salary.toLocaleString('en-IN')} × ${years}) / 26\n= ₹${gratuity.toLocaleString('en-IN')}`;
    } else {
      // Not covered: Gratuity = (15 × Last drawn salary × Years of service) / 30
      gratuity = Math.round((15 * salary * years) / 30);
      breakdown = `Formula (Not covered under Act):\nGratuity = (15 × Last Drawn Salary × Years) / 30\n= (15 × ₹${salary.toLocaleString('en-IN')} × ${years}) / 30\n= ₹${gratuity.toLocaleString('en-IN')}`;
    }

    const maxGratuity = 2500000;
    if (gratuity > maxGratuity) {
      breakdown += `\n\n⚠️ Maximum gratuity payable is ₹25,00,000 (as per current ceiling). Amount capped.`;
      gratuity = maxGratuity;
    }

    breakdown += `\n\n📌 "Last Drawn Salary" = Basic Pay + DA (Dearness Allowance)\n📌 Service > 6 months in last year is rounded up\n📌 Tax-exempt up to ₹25 lakh under Sec 10(10) of Income Tax Act`;

    setResult({ gratuity, breakdown });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Last Drawn Monthly Salary — Basic + DA (₹)</label>
          <input type="number" value={lastSalary} onChange={e => setLastSalary(e.target.value)} placeholder="e.g. 50000"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Years of Service</label>
          <input type="number" value={yearsOfService} onChange={e => setYearsOfService(e.target.value)} placeholder="e.g. 10"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 transition-all" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Employee Type</label>
          <select value={employeeType} onChange={e => setEmployeeType(e.target.value as any)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-all">
            <option value="covered">Covered under Gratuity Act</option>
            <option value="not-covered">Not Covered</option>
          </select>
        </div>
      </div>
      <button onClick={calculate} className="w-full py-2.5 bg-accent hover:bg-accent-hover text-bg rounded-lg font-medium text-sm transition-all active:scale-[0.98]">Calculate Gratuity</button>
      {result && (
        <div className="bg-bg rounded-xl border border-border p-5 animate-fade-in">
          <div className="text-center mb-4">
            <p className="text-xs text-text-tertiary mb-1">Gratuity Amount</p>
            <p className="text-3xl font-bold text-accent">₹{result.gratuity.toLocaleString('en-IN')}</p>
          </div>
          <pre className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">{result.breakdown}</pre>
        </div>
      )}
    </div>
  );
};

// ── Maintenance Calculator ──
const MaintenanceCalc = () => {
  const [husbandIncome, setHusbandIncome] = useState('');
  const [wifeIncome, setWifeIncome] = useState('');
  const [children, setChildren] = useState('0');
  const [result, setResult] = useState<{ maintenance: number; breakdown: string } | null>(null);

  const calculate = () => {
    const hIncome = parseFloat(husbandIncome) || 0;
    const wIncome = parseFloat(wifeIncome) || 0;
    const numChildren = parseInt(children) || 0;

    // General judicial trend: 20-30% of husband's net income for wife
    // + 5-10% per child. Adjusted if wife has independent income.
    const wifePct = wIncome > 0 ? 0.20 : 0.25;
    const childPct = 0.07;

    const wifeMaintenance = Math.round(hIncome * wifePct);
    const childMaintenance = Math.round(hIncome * childPct * numChildren);
    const total = wifeMaintenance + childMaintenance;

    const breakdown = `Based on judicial trends:\n\nHusband's Monthly Income: ₹${hIncome.toLocaleString('en-IN')}\nWife's Monthly Income: ₹${wIncome.toLocaleString('en-IN')}\nNumber of Children: ${numChildren}\n\nWife's Maintenance (~${(wifePct * 100).toFixed(0)}%): ₹${wifeMaintenance.toLocaleString('en-IN')}/month\nChildren's Maintenance (~${(childPct * 100).toFixed(0)}% each × ${numChildren}): ₹${childMaintenance.toLocaleString('en-IN')}/month\n\nEstimated Total: ₹${total.toLocaleString('en-IN')}/month\n\n📌 Under Sec 125 CrPC / Sec 144 BNSS, courts generally award 20-30% of husband's net income\n📌 Supreme Court guideline in Rajnesh vs Neha (2021): Maintenance should not exceed 25% without special circumstances\n📌 Wife's independent income reduces the percentage\n📌 Actual amount varies based on lifestyle, needs, and court discretion`;

    setResult({ maintenance: total, breakdown });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Husband's Monthly Income (₹)</label>
          <input type="number" value={husbandIncome} onChange={e => setHusbandIncome(e.target.value)} placeholder="e.g. 80000"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Wife's Monthly Income (₹)</label>
          <input type="number" value={wifeIncome} onChange={e => setWifeIncome(e.target.value)} placeholder="0 if none"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 transition-all" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Number of Children</label>
          <input type="number" value={children} onChange={e => setChildren(e.target.value)} placeholder="0"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 transition-all" />
        </div>
      </div>
      <button onClick={calculate} className="w-full py-2.5 bg-accent hover:bg-accent-hover text-bg rounded-lg font-medium text-sm transition-all active:scale-[0.98]">Estimate Maintenance</button>
      {result && (
        <div className="bg-bg rounded-xl border border-border p-5 animate-fade-in">
          <div className="text-center mb-4">
            <p className="text-xs text-text-tertiary mb-1">Estimated Monthly Maintenance</p>
            <p className="text-3xl font-bold text-accent">₹{result.maintenance.toLocaleString('en-IN')}<span className="text-base text-text-tertiary font-normal">/month</span></p>
          </div>
          <pre className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">{result.breakdown}</pre>
        </div>
      )}
    </div>
  );
};

// ── Bail Surety Calculator ──
const BailSuretyCalc = () => {
  const [offenceType, setOffenceType] = useState<'bailable' | 'non-bailable'>('bailable');
  const [seriousness, setSeriousness] = useState<'minor' | 'moderate' | 'serious'>('moderate');
  const [incomeLevel, setIncomeLevel] = useState('');
  const [result, setResult] = useState<{ surety: number; bond: number; breakdown: string } | null>(null);

  const calculate = () => {
    const income = parseFloat(incomeLevel) || 0;

    const multipliers: Record<string, Record<string, number>> = {
      bailable: { minor: 0.5, moderate: 1, serious: 2 },
      'non-bailable': { minor: 2, moderate: 4, serious: 8 },
    };

    const mult = multipliers[offenceType][seriousness];
    const bond = Math.round(income * mult);
    const surety = bond; // typically equal

    const breakdown = `Offence Type: ${offenceType === 'bailable' ? 'Bailable' : 'Non-Bailable'}\nSeriousness: ${seriousness.charAt(0).toUpperCase() + seriousness.slice(1)}\nMonthly Income: ₹${income.toLocaleString('en-IN')}\n\nEstimated Personal Bond: ₹${bond.toLocaleString('en-IN')}\nEstimated Surety Amount: ₹${surety.toLocaleString('en-IN')}\n\n📌 Bail amount is at the Magistrate/Judge's discretion\n📌 For bailable offences, bail is a matter of right\n📌 Surety can be in cash, property deed, or FD\n📌 If unable to furnish surety, apply for waiver citing Hussainara Khatoon v. State of Bihar\n📌 Under BNSS Sec 480, accused must be produced within 24 hours`;

    setResult({ surety, bond, breakdown });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Offence Type</label>
          <select value={offenceType} onChange={e => setOffenceType(e.target.value as any)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-all">
            <option value="bailable">Bailable</option>
            <option value="non-bailable">Non-Bailable</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Seriousness</label>
          <select value={seriousness} onChange={e => setSeriousness(e.target.value as any)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-all">
            <option value="minor">Minor</option>
            <option value="moderate">Moderate</option>
            <option value="serious">Serious</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Accused's Monthly Income (₹)</label>
          <input type="number" value={incomeLevel} onChange={e => setIncomeLevel(e.target.value)} placeholder="e.g. 30000"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all" />
        </div>
      </div>
      <button onClick={calculate} className="w-full py-2.5 bg-accent hover:bg-accent-hover text-bg rounded-lg font-medium text-sm transition-all active:scale-[0.98]">Estimate Bail Amount</button>
      {result && (
        <div className="bg-bg rounded-xl border border-border p-5 animate-fade-in">
          <div className="flex justify-center gap-4 sm:gap-8 mb-4">
            <div className="text-center">
              <p className="text-xs text-text-tertiary mb-1">Personal Bond</p>
              <p className="text-xl sm:text-2xl font-bold text-accent">₹{result.bond.toLocaleString('en-IN')}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-tertiary mb-1">Surety</p>
              <p className="text-xl sm:text-2xl font-bold text-violet-400">₹{result.surety.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <pre className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">{result.breakdown}</pre>
        </div>
      )}
    </div>
  );
};

// ── Main Calculators Page ──
export const Calculators = () => {
  const [activeTab, setActiveTab] = useState<CalcTab>('court-fees');

  const renderCalculator = () => {
    switch (activeTab) {
      case 'court-fees': return <CourtFeesCalc />;
      case 'interest': return <InterestCalc />;
      case 'gratuity': return <GratuityCalc />;
      case 'maintenance': return <MaintenanceCalc />;
      case 'bail-surety': return <BailSuretyCalc />;
    }
  };

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full box-border">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-1">
            <CalculatorIcon className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Smart Calculators</h2>
          </div>
          <p className="text-xs sm:text-sm text-text-tertiary ml-8 sm:ml-9">Estimate court fees, interest, gratuity, maintenance & bail amounts.</p>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1.5 sm:gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {CALC_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-medium rounded-lg transition-all border ${
                activeTab === tab.id
                  ? 'bg-accent text-bg border-accent'
                  : 'bg-bg-secondary text-text-secondary border-border hover:bg-bg-tertiary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Calculator */}
        <div className="bg-bg-secondary border border-border rounded-xl p-4 sm:p-6">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-text-primary">{CALC_TABS.find(t => t.id === activeTab)?.label}</h3>
            <p className="text-xs text-text-tertiary mt-0.5">{CALC_TABS.find(t => t.id === activeTab)?.desc}</p>
          </div>
          {renderCalculator()}
        </div>

        {/* Disclaimer */}
        <p className="text-center text-[10px] text-text-muted mt-6">
          These are estimates based on general legal formulae and judicial trends. Actual amounts are determined by the court. Always consult a qualified advocate.
        </p>
      </div>
    </div>
  );
};
