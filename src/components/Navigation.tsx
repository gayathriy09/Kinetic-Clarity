import React from 'react';
import { 
  Mic, 
  BarChart3, 
  Compass, 
  BookOpen, 
  Sparkles, 
  Radio, 
  ShieldCheck, 
  Globe,
  MessageSquare,
  Headphones
} from 'lucide-react';

export type NavigationTab = 
  | 'cockpit' 
  | 'live-voice'
  | 'search-radar' 
  | 'chatbot' 
  | 'analytics' 
  | 'scenarios' 
  | 'star-vault';

interface NavigationProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  activeScenarioTitle?: string;
  hasSessionEvaluation: boolean;
  onNewSessionClick: () => void;
  isRecording?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  activeScenarioTitle = 'Stripe VP of Eng',
  hasSessionEvaluation,
  onNewSessionClick,
  isRecording = false,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTabChange('cockpit')}
              className="flex items-center gap-2.5 text-left group focus-visible:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                    Kinetic Clarity
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    Executive
                  </span>
                </div>
                <div className="text-xs text-slate-500 -mt-0.5 hidden sm:block">
                  AI Interview Cockpit & Telemetry
                </div>
              </div>
            </button>
          </div>

          {/* Center Navigation Tabs (Segmented controls) */}
          <nav className="hidden lg:flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 text-xs font-medium overflow-x-auto max-w-3xl no-scrollbar">
            
            {/* 1. Live Cockpit */}
            <button
              onClick={() => onTabChange('cockpit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                currentTab === 'cockpit'
                  ? 'bg-white text-blue-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Live Cockpit</span>
              {isRecording && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>

            {/* 2. Live API Voice Room (gemini-3.8-live) */}
            <button
              onClick={() => onTabChange('live-voice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                currentTab === 'live-voice'
                  ? 'bg-white text-purple-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Headphones className="w-3.5 h-3.5 text-purple-600" />
              <span>Voice Room (3.8 Live)</span>
            </button>

            {/* 3. Google Search Radar (gemini-3.5-flash with googleSearch) */}
            <button
              onClick={() => onTabChange('search-radar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                currentTab === 'search-radar'
                  ? 'bg-white text-blue-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>Search Radar</span>
            </button>

            {/* 6. Gemini Chatbot */}
            <button
              onClick={() => onTabChange('chatbot')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                currentTab === 'chatbot'
                  ? 'bg-white text-blue-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
              <span>AI Chatbot</span>
            </button>

            {/* 7. Performance Report */}
            <button
              onClick={() => onTabChange('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                currentTab === 'analytics'
                  ? 'bg-white text-blue-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Report</span>
              {hasSessionEvaluation && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
                  Ready
                </span>
              )}
            </button>

            {/* 8. Scenarios */}
            <button
              onClick={() => onTabChange('scenarios')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                currentTab === 'scenarios'
                  ? 'bg-white text-blue-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Tracks</span>
            </button>

            {/* 9. STAR Vault */}
            <button
              onClick={() => onTabChange('star-vault')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                currentTab === 'star-vault'
                  ? 'bg-white text-blue-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>STAR Vault</span>
            </button>

          </nav>

          {/* Right Action & Status */}
          <div className="flex items-center gap-3">
            <div className="hidden xl:flex items-center gap-2 text-xs text-slate-500 border-r border-slate-200 pr-3">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="max-w-[120px] truncate font-medium text-slate-700">
                {activeScenarioTitle}
              </span>
            </div>

            <button
              onClick={onNewSessionClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors shadow-sm focus-visible:outline-none"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              <span>Launch</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation Row */}
        <div className="lg:hidden flex items-center justify-between py-2 border-t border-slate-100 overflow-x-auto gap-2 text-xs no-scrollbar">
          <button
            onClick={() => onTabChange('cockpit')}
            className={`px-2.5 py-1 rounded-md shrink-0 ${currentTab === 'cockpit' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'}`}
          >
            Cockpit
          </button>
          <button
            onClick={() => onTabChange('live-voice')}
            className={`px-2.5 py-1 rounded-md shrink-0 ${currentTab === 'live-voice' ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-600'}`}
          >
            Voice Room (3.8)
          </button>
          <button
            onClick={() => onTabChange('search-radar')}
            className={`px-2.5 py-1 rounded-md shrink-0 ${currentTab === 'search-radar' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'}`}
          >
            Search Radar
          </button>
          <button
            onClick={() => onTabChange('chatbot')}
            className={`px-2.5 py-1 rounded-md shrink-0 ${currentTab === 'chatbot' ? 'bg-purple-50 text-purple-700 font-bold' : 'text-slate-600'}`}
          >
            Chatbot
          </button>
          <button
            onClick={() => onTabChange('analytics')}
            className={`px-2.5 py-1 rounded-md shrink-0 ${currentTab === 'analytics' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'}`}
          >
            Report
          </button>
          <button
            onClick={() => onTabChange('scenarios')}
            className={`px-2.5 py-1 rounded-md shrink-0 ${currentTab === 'scenarios' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'}`}
          >
            Tracks
          </button>
          <button
            onClick={() => onTabChange('star-vault')}
            className={`px-2.5 py-1 rounded-md shrink-0 ${currentTab === 'star-vault' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'}`}
          >
            STAR Vault
          </button>
        </div>

      </div>
    </header>
  );
};
