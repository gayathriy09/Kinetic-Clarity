import React, { useState } from 'react';
import { Navigation, NavigationTab } from './components/Navigation';
import { LiveCockpit } from './components/LiveCockpit';
import { AnalyticsReport } from './components/AnalyticsReport';
import { ScenarioLaunchpad } from './components/ScenarioLaunchpad';
import { StarVault } from './components/StarVault';
import { SearchGroundingRadar } from './components/SearchGroundingRadar';
import { GeminiChatbot } from './components/GeminiChatbot';
import { LiveVoiceRoom } from './components/LiveVoiceRoom';
import { MOCK_SCENARIOS, MOCK_DEFAULT_SESSION_EVALUATION } from './data/mockScenarios';
import { InterviewScenario, SessionEvaluation } from './types/interview';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('cockpit');
  const [activeScenario, setActiveScenario] = useState<InterviewScenario>(MOCK_SCENARIOS[0]);
  const [currentEvaluation, setCurrentEvaluation] = useState<SessionEvaluation>(MOCK_DEFAULT_SESSION_EVALUATION);

  const handleSessionComplete = (evaluation: SessionEvaluation) => {
    setCurrentEvaluation(evaluation);
    setCurrentTab('analytics');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectScenario = (scenario: InterviewScenario) => {
    setActiveScenario(scenario);
  };

  const handleStartSimulationFromLaunchpad = () => {
    setCurrentTab('cockpit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetakeSession = () => {
    setCurrentTab('cockpit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplyCompanyFromSearchRadar = (company: string, briefing: string) => {
    const updated: InterviewScenario = {
      ...activeScenario,
      companyTarget: company,
      description: `${briefing.slice(0, 180)}...`,
    };
    setActiveScenario(updated);
    setCurrentTab('cockpit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] selection:bg-blue-100 selection:text-blue-900">
      
      {/* Top Navigation */}
      <Navigation
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        activeScenarioTitle={activeScenario.title}
        hasSessionEvaluation={!!currentEvaluation}
        onNewSessionClick={() => setCurrentTab('scenarios')}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {currentTab === 'cockpit' && (
          <LiveCockpit
            scenario={activeScenario}
            onSessionComplete={handleSessionComplete}
            onOpenScenarioModal={() => setCurrentTab('scenarios')}
          />
        )}

        {currentTab === 'live-voice' && (
          <LiveVoiceRoom />
        )}

        {currentTab === 'search-radar' && (
          <SearchGroundingRadar
            onApplyCompanyToScenario={handleApplyCompanyFromSearchRadar}
          />
        )}

        {currentTab === 'chatbot' && (
          <GeminiChatbot />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsReport
            evaluation={currentEvaluation}
            onRetakeSession={handleRetakeSession}
            onSelectNewScenario={() => setCurrentTab('scenarios')}
          />
        )}

        {currentTab === 'scenarios' && (
          <ScenarioLaunchpad
            currentScenario={activeScenario}
            onSelectScenario={handleSelectScenario}
            onStartSimulation={handleStartSimulationFromLaunchpad}
          />
        )}

        {currentTab === 'star-vault' && (
          <StarVault />
        )}
      </main>

      {/* Clean Bottom System Footer (Zero-Pill Discipline, subtle metadata) */}
      <footer className="border-t border-slate-200/80 bg-white/70 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Kinetic Clarity</span>
            <span aria-hidden="true">·</span>
            <span>Executive AI Interview Cockpit</span>
            <span aria-hidden="true">·</span>
            <span>Live API (gemini-3.8-live) · Speech-to-Text (gemini-3.5-transcribe) · Veo 3 (veo-3.1-fast-generate-preview)</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>Interviewer Voice TTS & Live Audio</span>
            <span aria-hidden="true">·</span>
            <span>gemini-3.1-pro-preview / gemini-3.5-flash / gemini-3.1-flash-lite</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
