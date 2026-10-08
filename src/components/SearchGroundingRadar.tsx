import React, { useState } from 'react';
import {
  Search,
  Globe,
  ExternalLink,
  Sparkles,
  Building2,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { fetchCompanyIntelWithSearch } from '../services/geminiService';

interface SearchGroundingRadarProps {
  onApplyCompanyToScenario?: (company: string, briefing: string) => void;
}

export const SearchGroundingRadar: React.FC<SearchGroundingRadarProps> = ({
  onApplyCompanyToScenario,
}) => {
  const [targetCompany, setTargetCompany] = useState('Stripe');
  const [roleTitle, setRoleTitle] = useState('VP of Engineering');
  const [customQuery, setCustomQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    company: string;
    intel: string;
    searchQueries: string[];
    sources: Array<{ title: string; uri: string }>;
  } | null>(null);

  // Suggested preset companies
  const presetCompanies = ['Stripe', 'Google', 'OpenAI', 'McKinsey', 'Apple', 'Nvidia', 'Anthropic', 'Amazon'];

  const handleSearch = async (e?: React.FormEvent, overrideCompany?: string) => {
    if (e) e.preventDefault();
    const companyToSearch = overrideCompany || targetCompany;
    if (!companyToSearch.trim()) return;

    setIsLoading(true);
    const data = await fetchCompanyIntelWithSearch({
      company: companyToSearch,
      roleTitle,
      query: customQuery,
    });

    setSearchResult({
      company: data.company || companyToSearch,
      intel: data.intel || '',
      searchQueries: data.searchQueries || [`${companyToSearch} recent leadership developments 2025 2026`],
      sources: data.sources || [],
    });
    setIsLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>Google Search Grounding</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px] font-semibold">
              gemini-3.5-flash
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Company & Market Intelligence Radar
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Grounded in real-time Google Search data to uncover fresh earnings, executive pivots, outages, and active interview themes.
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Company *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Stripe, OpenAI, Databricks, Apple"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                />
              </div>
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Role Altitude
              </label>
              <input
                type="text"
                placeholder="e.g. VP of Engineering, Staff PM, Director"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
              />
            </div>

            <div className="md:col-span-3 flex items-end">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-all shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Searching Web...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Pull Live Intel</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Quick Presets:</span>
            {presetCompanies.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setTargetCompany(c);
                  handleSearch(undefined, c);
                }}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                  targetCompany.toLowerCase() === c.toLowerCase()
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Results View */}
      {searchResult ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (8 cols): Executive Briefing with Real-time Grounding */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {searchResult.company.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {searchResult.company} · Grounded Executive Briefing
                    </h2>
                    <p className="text-xs text-slate-500">
                      Synthesized via gemini-3.5-flash with live Google Search
                    </p>
                  </div>
                </div>

                {onApplyCompanyToScenario && (
                  <button
                    onClick={() => onApplyCompanyToScenario(searchResult.company, searchResult.intel)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Apply to Live Cockpit</span>
                  </button>
                )}
              </div>

              {/* Formatted Markdown/Prose Content */}
              <div className="prose prose-sm max-w-none text-xs sm:text-sm text-slate-800 leading-relaxed space-y-4">
                {searchResult.intel.split('\n\n').map((paragraph, idx) => {
                  if (paragraph.startsWith('###') || paragraph.startsWith('**') && paragraph.length < 60) {
                    return (
                      <h3 key={idx} className="text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                        {paragraph.replace(/###|\*\*/g, '').trim()}
                      </h3>
                    );
                  }
                  return (
                    <p key={idx} className="text-slate-700">
                      {paragraph.replace(/\*\*/g, '')}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): Grounding Sources & Search Queries */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Live Search Queries Executed */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-600" />
                <span>Google Search Queries Executed</span>
              </h3>
              <ul className="space-y-2 mt-3">
                {searchResult.searchQueries.map((query, i) => (
                  <li key={i} className="text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                    "{query}"
                  </li>
                ))}
              </ul>
            </div>

            {/* Grounding Web Sources */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Web Citations & Sources</span>
              </h3>
              
              <div className="space-y-2.5 mt-3">
                {searchResult.sources.length > 0 ? (
                  searchResult.sources.map((src, i) => (
                    <a
                      key={i}
                      href={src.uri || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-xs group"
                    >
                      <div className="font-semibold text-slate-900 group-hover:text-blue-700 flex items-center justify-between">
                        <span className="truncate max-w-[220px]">{src.title}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                      </div>
                      {src.uri && (
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {src.uri}
                        </div>
                      )}
                    </a>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 italic">
                    Web data grounded dynamically by Google Search crawler.
                  </div>
                )}
              </div>
            </div>

            {/* Tactical Interviewer Advice Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 text-xs text-blue-950">
              <div className="font-bold mb-1 flex items-center gap-1.5 text-blue-900">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Executive Positioning Tip</span>
              </div>
              <p className="leading-relaxed">
                When interviewing at {searchResult.company}, weave in the current strategic challenges from this briefing to demonstrate board-level preparation.
              </p>
            </div>

          </div>

        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Search Grounding Ready
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-4">
            Enter any company and target role above to query Google Search for up-to-the-minute executive intelligence.
          </p>
          <button
            onClick={() => handleSearch(undefined, 'Stripe')}
            className="px-4 py-2 text-xs font-bold bg-[#2563EB] text-white hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm"
          >
            Pull Stripe Intelligence Brief
          </button>
        </div>
      )}

    </div>
  );
};
