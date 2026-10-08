import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Volume2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ArrowRight,
  Download,
  Share2,
  MessageSquare,
  Zap,
  Target
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SessionEvaluation, TurnTranscript } from '../types/interview';

interface AnalyticsReportProps {
  evaluation: SessionEvaluation;
  onRetakeSession: () => void;
  onSelectNewScenario: () => void;
}

export const AnalyticsReport: React.FC<AnalyticsReportProps> = ({
  evaluation,
  onRetakeSession,
  onSelectNewScenario,
}) => {
  // Trigger celebration confetti on mount if executive readiness is high
  useEffect(() => {
    if (evaluation.overallScore >= 80) {
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#2563EB', '#7C3AED', '#10B981'],
        });
      } catch (e) {}
    }
  }, [evaluation.overallScore]);

  // Expanded transcripts state
  const [expandedTranscriptIds, setExpandedTranscriptIds] = useState<{ [id: string]: boolean }>({
    't-2': true, // expand first candidate turn by default
  });

  const toggleTranscriptExpand = (id: string) => {
    setExpandedTranscriptIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    return 'text-amber-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return 'bg-emerald-500';
    if (score >= 70) return 'bg-blue-600';
    return 'bg-amber-500';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Report Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-blue-600 uppercase tracking-wider">Performance Audit</span>
            <span aria-hidden="true">·</span>
            <span>{evaluation.completedAt}</span>
            <span aria-hidden="true">·</span>
            <span>Session ID: {evaluation.id.slice(-6)}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {evaluation.scenarioTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Executive readiness evaluation, delivery cadence metrics, and AI STAR refactoring.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRetakeSession}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Scenario</span>
          </button>

          <button
            onClick={onSelectNewScenario}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors shadow-sm shadow-blue-500/20"
          >
            <span>Explore Other Tracks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Primary 3-Column Top Metric Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Metric 1: Overall Executive Readiness Scorecard */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold uppercase tracking-wider text-slate-600">Executive Readiness</span>
              <Award className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-3 my-2">
              <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                {evaluation.overallScore}
              </span>
              <span className="text-lg font-bold text-slate-400">/ 100</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{evaluation.readinessLabel} (Top 12% Benchmark)</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600">
            Meets or exceeds director-level communication bar for Tier-1 companies.
          </div>
        </div>

        {/* Metric 2: Cadence & Pacing Telemetry */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold uppercase tracking-wider text-slate-600">Pacing & Delivery Cadence</span>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex items-baseline gap-2 my-2">
              <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                {evaluation.delivery.averageWpm}
              </span>
              <span className="text-sm font-semibold text-slate-500">WPM</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 mt-1">
              <span>Status: {evaluation.delivery.wpmStatus} (Ideal: 130–150 WPM)</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600">
            {evaluation.delivery.pausePacing}
          </div>
        </div>

        {/* Metric 3: Filler Words & Fluency */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold uppercase tracking-wider text-slate-600">Vocal Fluency & Fillers</span>
              <Volume2 className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2 my-2">
              <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                {evaluation.delivery.totalFillerWords}
              </span>
              <span className="text-sm font-semibold text-slate-500">instances</span>
            </div>
            <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-2">
              {evaluation.delivery.fillerBreakdown.length > 0 ? (
                evaluation.delivery.fillerBreakdown.map((f, i) => (
                  <span key={i} className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                    "{f.word}": {f.count}
                  </span>
                ))
              ) : (
                <span className="text-emerald-600 font-medium">Zero filler words detected!</span>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600">
            Industry standard allows $\le 4$ fillers per 3-minute answer block.
          </div>
        </div>

      </div>

      {/* 4 Core Competency Gauges with Benchmark Bars */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Competency Benchmark Matrix
            </h2>
            <p className="text-xs text-slate-500">
              Scored against peer directors and calibrated against standard rubrics
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            Calibrated Rubric
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(evaluation.competencies).map(([key, comp]) => (
            <div key={key} className="flex flex-col justify-between p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">{comp.name}</span>
                  <span className={`text-base font-extrabold ${getScoreColor(comp.score)}`}>
                    {comp.score}%
                  </span>
                </div>

                {/* Progress bar with benchmark indicator */}
                <div className="w-full h-2 rounded-full bg-slate-200 relative mb-3">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getScoreBg(comp.score)}`}
                    style={{ width: `${comp.score}%` }}
                  />
                  {/* Benchmark tick line at 80% */}
                  <div
                    className="absolute top-[-2px] bottom-[-2px] w-[2px] bg-slate-700"
                    style={{ left: `${comp.benchmark}%` }}
                    title={`Industry Benchmark: ${comp.benchmark}%`}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                  <span>Score: {comp.score}</span>
                  <span>Benchmark: {comp.benchmark}</span>
                </div>

                <p className="text-xs text-slate-700 font-medium mb-1">
                  {comp.summary}
                </p>
              </div>

              <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200/60 leading-relaxed">
                {comp.feedback}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* STAR Method Diagnostic Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              STAR Method Structural Audit
            </h2>
            <p className="text-xs text-slate-500">
              Granular analysis of Situation, Task, Action, and Result execution
            </p>
          </div>
          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md">
            Structural Rigor
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Situation */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">S</span>
                Situation
              </span>
              <span className="text-xs font-bold text-blue-600">
                {evaluation.starOverall.situation.score}%
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium mb-2">
              {evaluation.starOverall.situation.text}
            </p>
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg">
              <span className="font-semibold text-slate-700">Coach Tip: </span>
              {evaluation.starOverall.situation.tip}
            </div>
          </div>

          {/* Task */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">T</span>
                Task
              </span>
              <span className="text-xs font-bold text-blue-600">
                {evaluation.starOverall.task.score}%
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium mb-2">
              {evaluation.starOverall.task.text}
            </p>
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg">
              <span className="font-semibold text-slate-700">Coach Tip: </span>
              {evaluation.starOverall.task.tip}
            </div>
          </div>

          {/* Action */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center">A</span>
                Action
              </span>
              <span className="text-xs font-bold text-purple-600">
                {evaluation.starOverall.action.score}%
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium mb-2">
              {evaluation.starOverall.action.text}
            </p>
            <div className="text-[11px] text-slate-500 bg-purple-50/50 p-2 rounded-lg">
              <span className="font-semibold text-purple-900">Coach Tip: </span>
              {evaluation.starOverall.action.tip}
            </div>
          </div>

          {/* Result */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">R</span>
                Result
              </span>
              <span className="text-xs font-bold text-emerald-600">
                {evaluation.starOverall.result.score}%
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium mb-2">
              {evaluation.starOverall.result.text}
            </p>
            <div className="text-[11px] text-slate-500 bg-emerald-50/50 p-2 rounded-lg">
              <span className="font-semibold text-emerald-900">Coach Tip: </span>
              {evaluation.starOverall.result.tip}
            </div>
          </div>

        </div>
      </div>

      {/* Transcript Block with Expandable AI Suggestions (Matching Design Spec: #7C3AED left accent border 3px) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Interactive Time-Stamped Transcript
            </h2>
            <p className="text-xs text-slate-500">
              Review full dialogue with real-time inline AI coaching callouts and executive rewrites
            </p>
          </div>
          <span className="text-xs text-slate-500">
            {evaluation.transcripts.length} turns recorded
          </span>
        </div>

        <div className="space-y-6">
          {evaluation.transcripts.map((turn) => {
            const isCandidate = turn.speaker === 'candidate';
            const isExpanded = !!expandedTranscriptIds[turn.id];

            return (
              <div key={turn.id} className="relative">
                {/* Transcript Message Card */}
                <div className={`p-4 sm:p-5 rounded-xl border transition-all ${
                  isCandidate
                    ? 'bg-white border-slate-200 shadow-sm'
                    : 'bg-slate-50/80 border-slate-200/80'
                }`}>
                  
                  {/* Speaker Header with Timestamp */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isCandidate ? 'text-blue-700' : 'text-slate-900'}`}>
                        {isCandidate ? 'Candidate (You)' : 'Interviewer'}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {turn.timestamp}
                      </span>
                    </div>

                    {isCandidate && turn.wpm && (
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{turn.wpm} WPM</span>
                        {turn.aiSuggestion && (
                          <button
                            onClick={() => toggleTranscriptExpand(turn.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{isExpanded ? 'Hide AI Coaching' : 'View AI Coaching'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Spoken Text */}
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                    {turn.text}
                  </p>

                  {/* Inline AI Suggestion Container: Spec mandates #7C3AED left accent border (3px) */}
                  {isCandidate && turn.aiSuggestion && isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="pl-4 py-2 border-l-[3px] border-[#7C3AED] bg-purple-50/40 rounded-r-xl">
                        
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          <span className="text-xs font-bold text-purple-900">
                            AI EXECUTIVE REFACTOR & COACHING AUDIT
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 font-medium mb-3">
                          {turn.aiSuggestion.summary}
                        </p>

                        {/* Side-by-side or clean callout: Executive Polish */}
                        <div className="bg-white p-3.5 rounded-lg border border-purple-200/80 mb-3 shadow-xs">
                          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Zap className="w-3 h-3" />
                            <span>Executive Polish (High-Altitude STAR Formulation)</span>
                          </div>
                          <p className="text-xs text-slate-900 italic leading-relaxed">
                            "{turn.aiSuggestion.executiveRewrite}"
                          </p>
                        </div>

                        {/* Strengths & Improvements grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200/60">
                            <span className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1 text-[11px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Key Strengths
                            </span>
                            <ul className="space-y-1 text-[11px] text-emerald-950">
                              {turn.aiSuggestion.strengths.map((str, idx) => (
                                <li key={idx}>· {str}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/60">
                            <span className="font-bold text-amber-900 flex items-center gap-1.5 mb-1 text-[11px]">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              High-Leverage Growth Opportunities
                            </span>
                            <ul className="space-y-1 text-[11px] text-amber-950">
                              {turn.aiSuggestion.improvements.map((imp, idx) => (
                                <li key={idx}>· {imp}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actionable Executive Takeaways Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Core Strengths */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Verified Executive Strengths
            </h3>
          </div>
          <ul className="space-y-3">
            {evaluation.keyStrengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Growth Opportunities */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Target className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Priority Focus for Next Simulation
            </h3>
          </div>
          <ul className="space-y-3">
            {evaluation.growthOpportunities.map((growth, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                <span>{growth}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Bottom Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-slate-900 rounded-2xl text-white gap-4">
        <div>
          <h4 className="font-bold text-base">Ready for the Next Round?</h4>
          <p className="text-xs text-slate-300">
            Reinforce today's feedback or practice hostile drill follow-up questions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save Performance PDF</span>
          </button>
          <button
            onClick={onRetakeSession}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-colors shadow-sm"
          >
            Retake Scenario
          </button>
        </div>
      </div>

    </div>
  );
};
