import React, { useState } from 'react';
import {
  Compass,
  Building2,
  Users,
  Shield,
  Sparkles,
  ArrowRight,
  Flame,
  Plus,
  Check,
  Briefcase,
  Layers
} from 'lucide-react';
import { InterviewScenario, InterviewerPersona } from '../types/interview';
import { INTERVIEWER_PERSONAS, MOCK_SCENARIOS } from '../data/mockScenarios';
import { generateCustomQuestionsApi } from '../services/geminiService';

interface ScenarioLaunchpadProps {
  currentScenario: InterviewScenario;
  onSelectScenario: (scenario: InterviewScenario) => void;
  onStartSimulation: () => void;
}

export const ScenarioLaunchpad: React.FC<ScenarioLaunchpadProps> = ({
  currentScenario,
  onSelectScenario,
  onStartSimulation,
}) => {
  const [scenariosList, setScenariosList] = useState<InterviewScenario[]>(MOCK_SCENARIOS);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(currentScenario.id);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Standard' | 'Executive' | 'Hostile Drill'>('Executive');
  const [selectedInterviewer, setSelectedInterviewer] = useState<InterviewerPersona>(currentScenario.interviewer);

  // Custom scenario creation modal state
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customRoleTitle, setCustomRoleTitle] = useState('');
  const [customCompany, setCustomCompany] = useState('');
  const [customTrack, setCustomTrack] = useState('Executive Leadership');
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

  const activeScenario = scenariosList.find((s) => s.id === selectedScenarioId) || scenariosList[0];

  const handleApplyScenario = (scenario: InterviewScenario) => {
    setSelectedScenarioId(scenario.id);
    setSelectedInterviewer(scenario.interviewer);
    const updated = {
      ...scenario,
      interviewer: selectedInterviewer,
    };
    onSelectScenario(updated);
  };

  const handleLaunchCurrent = () => {
    const updated = {
      ...activeScenario,
      interviewer: selectedInterviewer,
    };
    onSelectScenario(updated);
    onStartSimulation();
  };

  const handleCreateCustomScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoleTitle.trim()) return;

    setIsGeneratingCustom(true);
    const generatedQuestions = await generateCustomQuestionsApi({
      roleTitle: customRoleTitle,
      company: customCompany || 'Tier-1 Enterprise',
      track: customTrack,
      difficulty: selectedDifficulty,
    });

    const newScenario: InterviewScenario = {
      id: `custom-${Date.now()}`,
      title: `${customRoleTitle} · ${customCompany || 'Target Organization'}`,
      track: customTrack,
      companyTarget: customCompany || 'Enterprise',
      description: `High-stakes evaluation calibrated specifically for the ${customRoleTitle} role at ${customCompany || 'Enterprise'}.`,
      interviewer: selectedInterviewer,
      questions: generatedQuestions || activeScenario.questions,
      targetWpmMin: 125,
      targetWpmMax: 155,
    };

    setScenariosList((prev) => [newScenario, ...prev]);
    setSelectedScenarioId(newScenario.id);
    onSelectScenario(newScenario);
    setIsGeneratingCustom(false);
    setIsCreatingCustom(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-blue-600 uppercase tracking-wider">Interview Tracks</span>
            <span aria-hidden="true">·</span>
            <span>Director, VP & C-Suite Calibration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Scenario Launchpad
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Select a verified executive track, configure interviewer personas, or generate a custom scenario using Gemini AI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreatingCustom(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 text-purple-600" />
            <span>Generate Custom Role</span>
          </button>

          <button
            onClick={handleLaunchCurrent}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors shadow-sm shadow-blue-500/20"
          >
            <span>Launch Active Cockpit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Track Selection & Persona Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (7 Columns): Scenario Tracks */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Available Executive Tracks
            </h2>
            <span className="text-xs text-slate-500">
              {scenariosList.length} Tracks Configured
            </span>
          </div>

          <div className="space-y-3.5">
            {scenariosList.map((scenario) => {
              const isSelected = scenario.id === selectedScenarioId;

              return (
                <div
                  key={scenario.id}
                  onClick={() => handleApplyScenario(scenario)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span className="font-semibold text-blue-600">{scenario.track}</span>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {scenario.companyTarget}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{scenario.questions.length} Questions</span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 mb-1.5">
                        {scenario.title}
                      </h3>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {scenario.description}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>

                  {/* Sample Question Preview */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[420px]">
                      Q1: "{scenario.questions[0]?.question}"
                    </span>
                    <span className="font-semibold text-purple-700 shrink-0 ml-2">
                      {scenario.questions[0]?.difficulty}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (5 Columns): Interviewer Persona & Rigor Settings */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Persona Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Interviewer Persona</span>
              </h3>
              <span className="text-[11px] text-slate-500">Select avatar & style</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {INTERVIEWER_PERSONAS.map((persona) => {
                const isCurrent = persona.id === selectedInterviewer.id;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => setSelectedInterviewer(persona)}
                    className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                      isCurrent
                        ? 'border-purple-600 bg-purple-50/50 shadow-xs ring-1 ring-purple-600/30'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <img
                      src={persona.avatarUrl}
                      alt={persona.name}
                      className="w-12 h-12 rounded-full object-cover mb-2 border border-slate-200"
                    />
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {persona.name}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      {persona.company}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Persona Detail */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="font-bold text-slate-900 mb-1">
                {selectedInterviewer.name} · {selectedInterviewer.title}
              </div>
              <p className="text-slate-600 leading-relaxed mb-2">
                "{selectedInterviewer.style}"
              </p>
              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                <span className="font-semibold text-slate-700">Focus: </span>
                {selectedInterviewer.focusArea}
              </div>
            </div>
          </div>

          {/* Difficulty & Rigor Mode */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <span>Simulation Difficulty</span>
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {(['Standard', 'Executive', 'Hostile Drill'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                    selectedDifficulty === diff
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
              {selectedDifficulty === 'Hostile Drill'
                ? 'Interviewer introduces unexpected production incidents, revenue crises, and skeptical follow-up probes.'
                : selectedDifficulty === 'Executive'
                ? 'Calibrated for Director and VP candidates testing strategic trade-offs and organizational leverage.'
                : 'Balanced scenario assessing baseline communication and problem framing.'}
            </p>
          </div>

          {/* Launch Action Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white shadow-md">
            <h4 className="font-bold text-sm mb-1">Ready to step into the Cockpit?</h4>
            <p className="text-xs text-blue-100 mb-4 leading-relaxed">
              Real-time speech transcription, cadence analytics, and instant STAR feedback are armed.
            </p>
            <button
              onClick={handleLaunchCurrent}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-white text-blue-700 hover:bg-blue-50 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>Enter Simulation Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* Custom Scenario Generator Modal */}
      {isCreatingCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Generate Custom Executive Scenario
                </h3>
              </div>
              <button
                onClick={() => setIsCreatingCustom(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomScenario} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Role Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VP of Security, Staff Machine Learning Architect"
                  value={customRoleTitle}
                  onChange={(e) => setCustomRoleTitle(e.target.value)}
                  className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Company / Organization
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apple, OpenAI, Airbnb, Goldman Sachs"
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value)}
                  className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Track / Competency Domain
                </label>
                <select
                  value={customTrack}
                  onChange={(e) => setCustomTrack(e.target.value)}
                  className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Executive Leadership">Executive Leadership & Culture</option>
                  <option value="Engineering & Infrastructure">Engineering & Distributed Scale</option>
                  <option value="Product Vision & Strategy">Product Vision & Growth</option>
                  <option value="Strategy & Corporate Ops">Strategy & Transformation</option>
                  <option value="AI Safety & Systems">AI Safety & Frontier Models</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingCustom(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingCustom}
                  className="px-4 py-2 text-xs font-bold bg-[#2563EB] text-white hover:bg-[#1D4ED8] rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isGeneratingCustom ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Synthesizing Questions...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate & Add Track</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
