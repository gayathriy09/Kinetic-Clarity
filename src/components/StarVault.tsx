import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Sparkles,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Trash2,
  Edit3,
  CheckCircle2,
  Building2,
  Zap,
  TrendingUp,
  X
} from 'lucide-react';
import { StarStory } from '../types/interview';
import { INITIAL_STAR_STORIES } from '../data/mockScenarios';
import { polishStarStoryApi } from '../services/geminiService';

export const StarVault: React.FC = () => {
  const [stories, setStories] = useState<StarStory[]>(INITIAL_STAR_STORIES);
  const [selectedStory, setSelectedStory] = useState<StarStory>(INITIAL_STAR_STORIES[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);

  // Form states for adding/editing
  const [formStory, setFormStory] = useState<StarStory>(INITIAL_STAR_STORIES[0]);

  // Teleprompter rehearsal mode states
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [teleprompterSpeed, setTeleprompterSpeed] = useState<number>(2); // 1 = slow, 2 = medium, 3 = brisk
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const teleprompterScrollRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll effect
  useEffect(() => {
    let scrollInterval: any = null;
    if (isTeleprompterOpen && isAutoScrolling) {
      scrollInterval = setInterval(() => {
        if (teleprompterScrollRef.current) {
          teleprompterScrollRef.current.scrollTop += teleprompterSpeed;
        }
      }, 40);
    }
    return () => clearInterval(scrollInterval);
  }, [isTeleprompterOpen, isAutoScrolling, teleprompterSpeed]);

  const handleSelectStory = (story: StarStory) => {
    setSelectedStory(story);
    setFormStory(story);
    setIsEditing(false);
  };

  const handleNewStory = () => {
    const blank: StarStory = {
      id: `story-${Date.now()}`,
      title: 'New Executive Achievement Narrative',
      category: 'Leadership & Scalability',
      company: 'Enterprise Inc.',
      metrics: '+35% velocity, $10M protected',
      situation: '',
      task: '',
      action: '',
      result: '',
      updatedAt: 'Just now',
    };
    setSelectedStory(blank);
    setFormStory(blank);
    setIsEditing(true);
  };

  const handleSaveStory = (e: React.FormEvent) => {
    e.preventDefault();
    const existingIndex = stories.findIndex((s) => s.id === formStory.id);
    if (existingIndex >= 0) {
      const updated = [...stories];
      updated[existingIndex] = { ...formStory, updatedAt: 'Just now' };
      setStories(updated);
      setSelectedStory(updated[existingIndex]);
    } else {
      const updated = [formStory, ...stories];
      setStories(updated);
      setSelectedStory(formStory);
    }
    setIsEditing(false);
  };

  const handleDeleteStory = (id: string) => {
    const filtered = stories.filter((s) => s.id !== id);
    setStories(filtered);
    if (filtered.length > 0) {
      setSelectedStory(filtered[0]);
      setFormStory(filtered[0]);
    }
  };

  const handleAiPolish = async () => {
    if (!formStory.situation && !formStory.action) return;
    setIsPolishing(true);
    const result = await polishStarStoryApi({
      situation: formStory.situation,
      task: formStory.task,
      action: formStory.action,
      result: formStory.result,
      roleContext: formStory.category,
    });

    if (result) {
      const updated: StarStory = {
        ...formStory,
        situation: result.polishedSituation || formStory.situation,
        task: result.polishedTask || formStory.task,
        action: result.polishedAction || formStory.action,
        result: result.polishedResult || formStory.result,
        title: result.executiveHeadline || formStory.title,
        metrics: result.suggestedMetrics ? result.suggestedMetrics.join(', ') : formStory.metrics,
      };
      setFormStory(updated);
      setSelectedStory(updated);
      // Also update in list if exists
      setStories((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    }
    setIsPolishing(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-semibold text-purple-600 uppercase tracking-wider">STAR Story Vault</span>
            <span aria-hidden="true">·</span>
            <span>Career Win Teleprompter & AI Polish</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Executive Narrative Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Craft, polish, and rehearse battle-tested STAR stories for high-stakes leadership conversations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleNewStory}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Add New Story</span>
          </button>

          <button
            onClick={() => {
              setIsTeleprompterOpen(true);
              setIsAutoScrolling(false);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors shadow-sm shadow-purple-500/20"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Launch Teleprompter Rehearsal</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Story List on Left, Active Story Detail/Editor on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Story List (4 Columns) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">
            <span>Saved Stories ({stories.length})</span>
          </div>

          {stories.map((story) => {
            const isSelected = story.id === selectedStory.id;
            return (
              <div
                key={story.id}
                onClick={() => handleSelectStory(story)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-purple-500 shadow-sm ring-1 ring-purple-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span className="font-semibold text-purple-600">{story.category}</span>
                  <span>{story.updatedAt}</span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1.5 line-clamp-2">
                  {story.title}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="truncate max-w-[150px]">{story.company}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 font-medium truncate">{story.metrics}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Story Workspace (8 Columns) */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  {selectedStory.category}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedStory.title}
                </h2>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>{selectedStory.company}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 font-medium">Metrics: {selectedStory.metrics}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAiPolish}
                  disabled={isPolishing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors disabled:opacity-50"
                  title="Rewrite using executive framing"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>{isPolishing ? 'Polishing...' : 'AI Polish & Refactor'}</span>
                </button>

                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200"
                  title="Edit story"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeleteStory(selectedStory.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200"
                  title="Delete story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveStory} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={formStory.title}
                      onChange={(e) => setFormStory({ ...formStory, title: e.target.value })}
                      className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={formStory.category}
                      onChange={(e) => setFormStory({ ...formStory, category: e.target.value })}
                      className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Company</label>
                    <input
                      type="text"
                      value={formStory.company}
                      onChange={(e) => setFormStory({ ...formStory, company: e.target.value })}
                      className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Key Metrics Impact</label>
                    <input
                      type="text"
                      value={formStory.metrics}
                      onChange={(e) => setFormStory({ ...formStory, metrics: e.target.value })}
                      className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Situation (Context & Crisis)</label>
                  <textarea
                    rows={2}
                    value={formStory.situation}
                    onChange={(e) => setFormStory({ ...formStory, situation: e.target.value })}
                    className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Task (Executive Responsibility)</label>
                  <textarea
                    rows={2}
                    value={formStory.task}
                    onChange={(e) => setFormStory({ ...formStory, task: e.target.value })}
                    className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Action (Specific Levers & Trade-offs)</label>
                  <textarea
                    rows={3}
                    value={formStory.action}
                    onChange={(e) => setFormStory({ ...formStory, action: e.target.value })}
                    className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Result (Hard Quantified Outcomes)</label>
                  <textarea
                    rows={2}
                    value={formStory.result}
                    onChange={(e) => setFormStory({ ...formStory, result: e.target.value })}
                    className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-[#2563EB] text-white hover:bg-[#1D4ED8] rounded-lg shadow-sm"
                  >
                    Save Narrative
                  </button>
                </div>
              </form>
            ) : (
              /* Story STAR Read View */
              <div className="space-y-4">
                
                {/* Situation */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                      S
                    </span>
                    <span className="text-xs font-bold text-slate-900">Situation</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed pl-7">
                    {selectedStory.situation || 'No situation recorded yet.'}
                  </p>
                </div>

                {/* Task */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                      T
                    </span>
                    <span className="text-xs font-bold text-slate-900">Task</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed pl-7">
                    {selectedStory.task || 'No task recorded yet.'}
                  </p>
                </div>

                {/* Action */}
                <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-200/80">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center">
                      A
                    </span>
                    <span className="text-xs font-bold text-slate-900">Action (Executive Levers)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed pl-7">
                    {selectedStory.action || 'No action recorded yet.'}
                  </p>
                </div>

                {/* Result */}
                <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/80">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                      R
                    </span>
                    <span className="text-xs font-bold text-slate-900">Result (Quantified Impact)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed pl-7">
                    {selectedStory.result || 'No result recorded yet.'}
                  </p>
                </div>

              </div>
            )}

          </div>
        </div>

      </div>

      {/* Full-Screen Teleprompter Rehearsal Overlay */}
      {isTeleprompterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-6 animate-in fade-in duration-200">
          
          {/* Teleprompter Top HUD Controls */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                TELEPROMPTER REHEARSAL MODE
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs text-slate-300 font-medium truncate max-w-md">
                {selectedStory.title}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Speed Controls */}
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-lg text-xs">
                <span className="text-slate-400 text-[11px] px-2">Speed:</span>
                {[1, 2, 3].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setTeleprompterSpeed(speed)}
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      teleprompterSpeed === speed ? 'bg-purple-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              {/* Play / Pause Auto Scroll */}
              <button
                onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isAutoScrolling ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {isAutoScrolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isAutoScrolling ? 'Pause Scroll' : 'Start Scroll'}</span>
              </button>

              <button
                onClick={() => {
                  if (teleprompterScrollRef.current) teleprompterScrollRef.current.scrollTop = 0;
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300"
                title="Reset scroll to top"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsTeleprompterOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300"
                title="Exit teleprompter"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Teleprompter Scrollable Speech Screen */}
          <div
            ref={teleprompterScrollRef}
            className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full py-12 px-4 space-y-12 select-none scroll-smooth"
          >
            {/* Guide line eye level indicator */}
            <div className="border-b-2 border-purple-500/30 pb-2 text-center text-xs font-mono text-purple-400 uppercase tracking-widest">
              ▼ Recommended Eye Level · Target Cadence 135 WPM ▼
            </div>

            <div className="space-y-10 text-xl sm:text-2xl md:text-3xl font-medium leading-relaxed tracking-tight text-slate-200">
              
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                  [S] Situation
                </div>
                <p>{selectedStory.situation}</p>
              </div>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                  [T] Task
                </div>
                <p>{selectedStory.task}</p>
              </div>

              <div className="bg-purple-950/30 p-6 rounded-2xl border border-purple-500/20">
                <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                  [A] Action (Executive Levers)
                </div>
                <p>{selectedStory.action}</p>
              </div>

              <div className="bg-emerald-950/30 p-6 rounded-2xl border border-emerald-500/20">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                  [R] Result (Quantified Business Impact)
                </div>
                <p>{selectedStory.result}</p>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
};
